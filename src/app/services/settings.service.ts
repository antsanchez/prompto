import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { signal } from '@angular/core';
import { StorageService } from './storage.service';
import { STORAGE_KEYS, API_ENDPOINTS, DEFAULTS } from '../core/constants';

export enum Provider {
  OLLAMA = 'Ollama',
  OPENAI = 'OpenAI',
  ANTHROPIC = 'Anthropic',
  MISTRAL = 'Mistral',
  COHERE = 'Cohere',
  GOOGLE = 'Google',
  XAI = 'xAI'
}

export interface ISettingsService {
  checkConnection(): void;
  clearAndResetOptions(): void;
  deleteAll(): void;
  deleteArena(key: string): void;
  deleteChat(key: string): void;
  deleteDiscussion(key: string): void;
  deleteTemplate(name: string): void;
  getAvailableModels(provider: Provider): string[];
  getModel(): string;
  getModels(provider: Provider): Promise<void>;
  getOptions(): Options;
  getOptionsFromProvider(provider: Provider): Options;
  getProvider(): Provider;
  getTemperature(): number;
  isConnected(): boolean;
  listProviders(): Provider[];
  loadKeys(): void;
  loadSettings(): void;
  loadTemplates(): void;
  saveSettings(): void;
  setApiKeyTemporarily(provider: Provider, apiKey: string): void;
  setConnected(connected: boolean): void;
  setDefaultSettings(): void;
  setEnterSubmit(enterSubmit: boolean): void;
  setOptions(options: Options): void;
}

export type Keys = {
  key: string;
  name: string;
};

export type System = {
  name: string;
  system: string;
};

export type Settings = {
  readonly provider: Provider;
  readonly enterSubmit: boolean;
  readonly options: Readonly<Record<Provider, Options>>;
};

export type Options = {
  provider: Provider;
  model: string;
  apiKey: string;
  apiUrl: string;
  temperature?: number;
  availableModels: string[];
};

interface ModelsResponse {
  models?: { id?: string; name?: string; supportedGenerationMethods?: string[] }[];
  data?: { id: string }[];
}

interface ModelFetchConfig {
  getUrl: (options: Options) => string | string[];
  getHeaders: (options: Options) => Record<string, string>;
  extractModels: (data: ModelsResponse) => string[];
  requiresApiKey: boolean;
}

const MODEL_FETCH_CONFIGS: Record<Provider, ModelFetchConfig> = {
  [Provider.OLLAMA]: {
    getUrl: (opts) => `${opts.apiUrl}/api/tags`,
    getHeaders: () => ({}),
    extractModels: (data) => data?.models?.map(m => m.name!) || [],
    requiresApiKey: false,
  },
  [Provider.OPENAI]: {
    getUrl: () => API_ENDPOINTS.OPENAI,
    getHeaders: (opts) => ({ 'Authorization': `Bearer ${opts.apiKey}` }),
    extractModels: (data) => data?.data?.map(m => m.id) || [],
    requiresApiKey: true,
  },
  [Provider.ANTHROPIC]: {
    getUrl: () => API_ENDPOINTS.ANTHROPIC,
    getHeaders: (opts) => ({ 'x-api-key': opts.apiKey, 'anthropic-version': '2023-06-01' }),
    extractModels: (data) => data?.models?.map(m => m.id!) || [],
    requiresApiKey: true,
  },
  [Provider.MISTRAL]: {
    getUrl: () => API_ENDPOINTS.MISTRAL,
    getHeaders: (opts) => ({ 'Authorization': `Bearer ${opts.apiKey}` }),
    extractModels: (data) => data?.data?.map(m => m.id) || [],
    requiresApiKey: true,
  },
  [Provider.COHERE]: {
    getUrl: () => API_ENDPOINTS.COHERE,
    getHeaders: (opts) => ({ 'accept': 'application/json', 'Authorization': `Bearer ${opts.apiKey}` }),
    extractModels: (data) => data?.models?.map(m => m.name!) || [],
    requiresApiKey: true,
  },
  [Provider.GOOGLE]: {
    getUrl: (opts) => [
      `${API_ENDPOINTS.GOOGLE_V1}?key=${opts.apiKey}`,
      `${API_ENDPOINTS.GOOGLE_V1BETA}?key=${opts.apiKey}`
    ],
    getHeaders: () => ({}),
    extractModels: (data) =>
      data?.models
        ?.filter(m => m?.supportedGenerationMethods?.includes('generateContent'))
        .map(m => m.name!) || [],
    requiresApiKey: true,
  },
  [Provider.XAI]: {
    getUrl: () => API_ENDPOINTS.XAI,
    getHeaders: (opts) => ({ 'Authorization': `Bearer ${opts.apiKey}` }),
    extractModels: (data) => data?.data?.map(m => m.id) || [],
    requiresApiKey: true,
  },
};

const DEFAULT_SETTINGS: Settings = {
  provider: Provider.OLLAMA,
  enterSubmit: false,
  options: {
    [Provider.OLLAMA]: {
      provider: Provider.OLLAMA,
      model: 'llama4',
      apiKey: '',
      apiUrl: 'http://localhost:11434',
      temperature: DEFAULTS.TEMPERATURE,
      availableModels: []
    },
    [Provider.OPENAI]: {
      provider: Provider.OPENAI,
      model: 'gpt-5.4',
      apiKey: '',
      apiUrl: '',
      temperature: DEFAULTS.TEMPERATURE,
      availableModels: []
    },
    [Provider.ANTHROPIC]: {
      provider: Provider.ANTHROPIC,
      model: 'claude-sonnet-4-6-20260217',
      apiKey: '',
      apiUrl: '',
      temperature: DEFAULTS.TEMPERATURE,
      availableModels: []
    },
    [Provider.MISTRAL]: {
      provider: Provider.MISTRAL,
      model: '',
      apiKey: '',
      apiUrl: '',
      temperature: DEFAULTS.TEMPERATURE,
      availableModels: []
    },
    [Provider.COHERE]: {
      provider: Provider.COHERE,
      model: '',
      apiKey: '',
      apiUrl: '',
      temperature: DEFAULTS.TEMPERATURE,
      availableModels: []
    },
    [Provider.GOOGLE]: {
      provider: Provider.GOOGLE,
      model: '',
      apiKey: '',
      apiUrl: '',
      temperature: DEFAULTS.TEMPERATURE,
      availableModels: []
    },
    [Provider.XAI]: {
      provider: Provider.XAI,
      model: 'grok-4',
      apiKey: '',
      apiUrl: '',
      temperature: DEFAULTS.TEMPERATURE,
      availableModels: []
    },
  }
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService implements ISettingsService {
  public readonly settings = signal<Settings>(DEFAULT_SETTINGS);
  public readonly savedDiscussionsSignal = signal<number>(0);
  public readonly savedDiscussions$ = this.savedDiscussionsSignal.asReadonly();

  private connectionChecked: boolean = false;
  private connected: boolean = false;

  public chats: Keys[] = [];
  public currentChatKey: string = "";

  public arenas: Keys[] = [];
  public currentArenaKey: string = "";

  public discussions: Keys[] = [];
  public currentDiscussionKey: string = "";

  public templates: System[] = [];
  public currentTemplateName: string = "";

  constructor(
    private http: HttpClient,
    private storage: StorageService
  ) { }

  private handleError(error: unknown, message: string): never {
    if (error instanceof Error) {
      throw new Error(`${message}: ${error.message}`);
    }
    throw new Error(message);
  }

  public loadSettings(): void {
    const settings = this.storage.getItem<Settings>(STORAGE_KEYS.SETTINGS);
    if (settings) {
      this.settings.set(settings);
    }

    if (Object.keys(this.settings()).length === 0) {
      this.setDefaultSettings();
    }

    for (let provider of this.listProviders()) {
      if (!this.settings().options[provider]) {
        const currentSettings = this.settings();
        const newSettings = {
          ...currentSettings,
          options: {
            ...currentSettings.options,
            [provider]: DEFAULT_SETTINGS.options[provider]
          }
        };
        this.settings.set(newSettings);
      }
    }
  }

  public setDefaultSettings(): void {
    this.settings.set(DEFAULT_SETTINGS);
  }

  public saveSettings(): void {
    this.storage.setItem(STORAGE_KEYS.SETTINGS, this.settings());
  }

  public setOptions(options: Options): void {
    if (!this.listProviders().includes(options.provider)) {
      throw new Error(`setOptions Unsupported provider: ${options.provider}`);
    }
    const currentSettings = this.settings();
    this.settings.set({
      ...currentSettings,
      provider: options.provider,
      options: {
        ...currentSettings.options,
        [options.provider]: options
      }
    });
    this.saveSettings();
  }

  public setEnterSubmit(enterSubmit: boolean): void {
    const currentSettings = this.settings();
    this.settings.set({
      ...currentSettings,
      enterSubmit
    });
    this.saveSettings();
  }

  public getProvider(): Provider {
    return this.settings().provider;
  }

  public getModel(): string {
    return this.settings().options[this.getProvider()]?.model || '';
  }

  public getOptions(): Options {
    return this.settings().options[this.getProvider()];
  }

  public clearAndResetOptions(): void {
    this.storage.removeItem(STORAGE_KEYS.SETTINGS);
    this.setDefaultSettings();
  }

  public getTemperature(): number {
    return this.settings().options[this.getProvider()]?.temperature || DEFAULTS.TEMPERATURE;
  }

  public listProviders(): Provider[] {
    return Object.values(Provider);
  }

  public getOptionsFromProvider(provider: Provider): Options {
    return this.settings().options[provider];
  }

  public getAvailableModels(provider: Provider): string[] {
    return this.settings().options[provider].availableModels;
  }

  public setApiKeyTemporarily(provider: Provider, apiKey: string): void {
    const currentSettings = this.settings();
    this.settings.set({
      ...currentSettings,
      options: {
        ...currentSettings.options,
        [provider]: {
          ...currentSettings.options[provider],
          apiKey
        }
      }
    });
  }

  public setConnected(connected: boolean): void {
    this.connectionChecked = true;
    this.connected = connected;
  }

  public checkConnection(): void {
    if (!this.connectionChecked) {
      try {
        this.getModels(this.getProvider());
        this.setConnected(true);
      } catch (error) {
        this.setConnected(false);
        console.error('Error checking connection:', error);
      }
    }
  }

  public isConnected(): boolean {
    if (!this.connected && this.connectionChecked) {
      return false;
    }
    if (this.settings().options[this.getProvider()].availableModels.length === 0) {
      return false;
    }
    return true;
  }

  public async getModels(provider: Provider): Promise<void> {
    const config = MODEL_FETCH_CONFIGS[provider];
    if (!config) {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    const options = this.settings().options[provider];

    if (config.requiresApiKey && !options.apiKey) {
      return;
    }

    try {
      const urls = config.getUrl(options);
      const headers = config.getHeaders(options);
      let allModels: string[];

      if (Array.isArray(urls)) {
        // Multiple endpoints (e.g. Google v1 + v1beta) — fetch in parallel, deduplicate
        const results = await Promise.all(
          urls.map(url =>
            lastValueFrom(this.http.get<ModelsResponse>(url, { headers }))
              .catch(() => ({ models: [], data: [] } as ModelsResponse))
          )
        );
        allModels = [...new Set(results.flatMap(data => config.extractModels(data)))];
      } else {
        const data = await lastValueFrom(this.http.get<ModelsResponse>(urls, { headers }));
        allModels = config.extractModels(data);
      }

      const currentSettings = this.settings();
      this.settings.set({
        ...currentSettings,
        options: {
          ...currentSettings.options,
          [provider]: {
            ...currentSettings.options[provider],
            availableModels: allModels
          }
        }
      });
    } catch (e) {
      this.handleError(e, `Error getting ${provider} models`);
    }
  }

  loadKeys(): void {
    this.chats = this.storage.loadChats();
    this.arenas = this.storage.loadArenas();
    this.discussions = this.storage.loadDiscussions();

    // Update the signal by incrementing its value
    this.savedDiscussionsSignal.set(this.savedDiscussionsSignal() + 1);
  }

  public loadTemplates(): void {
    const templates = this.storage.getItem<System[]>(STORAGE_KEYS.TEMPLATES);
    this.templates = templates || [];
  }

  public deleteArena(key: string): void {
    this.storage.removeItem(key);
    this.arenas = this.arenas.filter((arena) => arena.key !== key);
    if (this.currentArenaKey === key) {
      this.currentArenaKey = "";
    }
  }

  public deleteChat(key: string): void {
    this.storage.removeItem(key);
    this.chats = this.chats.filter((chat) => chat.key !== key);
    if (this.currentChatKey === key) {
      this.currentChatKey = "";
    }
  }

  public deleteTemplate(name: string): void {
    this.loadTemplates();
    this.templates = this.templates.filter((template) => template.name !== name);
    this.storage.setItem(STORAGE_KEYS.TEMPLATES, this.templates);
  }

  public deleteDiscussion(key: string): void {
    this.storage.removeItem(key);
    this.discussions = this.discussions.filter((discussion) => discussion.key !== key);
    if (this.currentDiscussionKey === key) {
      this.currentDiscussionKey = "";
    }
  }

  public deleteAll(): void {
    this.storage.removeItemsWithPrefix(STORAGE_KEYS.CHAT);
    this.currentChatKey = "";
    this.chats = [];

    this.storage.removeItemsWithPrefix(STORAGE_KEYS.ARENA);
    this.currentArenaKey = "";
    this.arenas = [];

    this.storage.removeItem(STORAGE_KEYS.TEMPLATES);
    this.templates = [];

    this.storage.removeItemsWithPrefix(STORAGE_KEYS.DISCUSSION);

    this.clearAndResetOptions();
  }
}
