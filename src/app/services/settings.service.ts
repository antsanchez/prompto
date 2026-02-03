import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { signal } from '@angular/core';
import { StorageService } from './storage.service';
import { STORAGE_KEYS, API_ENDPOINTS, DEFAULTS } from '../core/constants';

interface OllamaModelsResponse {
  models?: { name: string }[];
}

interface OpenAIModelsResponse {
  data?: { id: string }[];
}

interface AnthropicModelsResponse {
  models?: { id: string }[];
}

interface MistralModelsResponse {
  data?: { id: string }[];
}

interface CohereModelsResponse {
  models?: { name: string }[];
}

interface GoogleModelsResponse {
  models?: { name: string; supportedGenerationMethods?: string[] }[];
}

interface XaiModelsResponse {
  data?: { id: string }[];
}

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

const DEFAULT_SETTINGS: Settings = {
  provider: Provider.OLLAMA,
  enterSubmit: false,
  options: {
    [Provider.OLLAMA]: {
      provider: Provider.OLLAMA,
      model: 'llama3',
      apiKey: '',
      apiUrl: 'http://localhost:11434',
      temperature: DEFAULTS.TEMPERATURE,
      availableModels: []
    },
    [Provider.OPENAI]: {
      provider: Provider.OPENAI,
      model: 'gpt-4-turbo',
      apiKey: '',
      apiUrl: '',
      temperature: DEFAULTS.TEMPERATURE,
      availableModels: []
    },
    [Provider.ANTHROPIC]: {
      provider: Provider.ANTHROPIC,
      model: 'claude-3-5-sonnet-20241022',
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
      model: 'grok-3-fast',
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

  async getModelsFromOllama(): Promise<void> {
    const url = this.settings().options[Provider.OLLAMA].apiUrl + '/api/tags';
    try {
      const data = await lastValueFrom(this.http.get<OllamaModelsResponse>(url));
      const currentSettings = this.settings();
      this.settings.set({
        ...currentSettings,
        options: {
          ...currentSettings.options,
          [Provider.OLLAMA]: {
            ...currentSettings.options[Provider.OLLAMA],
            availableModels: data?.models?.map(model => model.name) || []
          }
        }
      });
    } catch (e) {
      this.handleError(e, 'Error getting Ollama models');
    }
  }

  async getModelsFromOpenAI(): Promise<void> {
    if (!this.settings().options[Provider.OPENAI].apiKey) {
      return;
    }
    try {
      const data = await lastValueFrom(this.http.get<OpenAIModelsResponse>(API_ENDPOINTS.OPENAI, {
        headers: {
          'Authorization': `Bearer ${this.settings().options[Provider.OPENAI].apiKey}`
        }
      }));
      const currentSettings = this.settings();
      this.settings.set({
        ...currentSettings,
        options: {
          ...currentSettings.options,
          [Provider.OPENAI]: {
            ...currentSettings.options[Provider.OPENAI],
            availableModels: data?.data?.map(model => model.id) || []
          }
        }
      });
    } catch (e) {
      this.handleError(e, 'Error getting OpenAI models');
    }
  }

  async getModelsFromAnthropic(): Promise<void> {
    if (!this.settings().options[Provider.ANTHROPIC].apiKey) {
      return;
    }

    try {
      const data = await lastValueFrom(this.http.get<AnthropicModelsResponse>(API_ENDPOINTS.ANTHROPIC, {
        headers: {
          'x-api-key': `${this.settings().options[Provider.ANTHROPIC].apiKey}`,
          'anthropic-version': '2023-06-01'
        }
      }));

      const currentSettings = this.settings();
      this.settings.set({
        ...currentSettings,
        options: {
          ...currentSettings.options,
          [Provider.ANTHROPIC]: {
            ...currentSettings.options[Provider.ANTHROPIC],
            availableModels: data?.models?.map(model => model.id) || []
          }
        }
      });
    } catch (e) {
      this.handleError(e, 'Error getting Anthropic models');
    }
  }

  async getModelsFromMistral(): Promise<void> {
    if (!this.settings().options[Provider.MISTRAL].apiKey) {
      return;
    }
    try {
      const data = await lastValueFrom(this.http.get<MistralModelsResponse>(API_ENDPOINTS.MISTRAL, {
        headers: {
          'Authorization': `Bearer ${this.settings().options[Provider.MISTRAL].apiKey}`
        }
      }));
      const currentSettings = this.settings();
      this.settings.set({
        ...currentSettings,
        options: {
          ...currentSettings.options,
          [Provider.MISTRAL]: {
            ...currentSettings.options[Provider.MISTRAL],
            availableModels: data?.data?.map(model => model.id) || []
          }
        }
      });
    } catch (e) {
      this.handleError(e, 'Error getting Mistral models');
    }
  }

  async getModelsFromCohere(): Promise<void> {
    if (!this.settings().options[Provider.COHERE].apiKey) {
      return;
    }

    try {
      const data = await lastValueFrom(this.http.get<CohereModelsResponse>(API_ENDPOINTS.COHERE, {
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${this.settings().options[Provider.COHERE].apiKey}`
        }
      }));
      const currentSettings = this.settings();
      this.settings.set({
        ...currentSettings,
        options: {
          ...currentSettings.options,
          [Provider.COHERE]: {
            ...currentSettings.options[Provider.COHERE],
            availableModels: data?.models?.map(model => model.name) || []
          }
        }
      });
    } catch (e) {
      this.handleError(e, 'Error getting Cohere models');
    }
  }

  async getModelsFromGoogle(): Promise<void> {
    if (!this.settings().options[Provider.GOOGLE].apiKey) {
      return;
    }

    try {
      const apiKey = this.settings().options[Provider.GOOGLE].apiKey;
      const v1Url = `${API_ENDPOINTS.GOOGLE_V1}?key=${apiKey}`;
      const v1betaUrl = `${API_ENDPOINTS.GOOGLE_V1BETA}?key=${apiKey}`;

      // Fetch from both v1 (stable) and v1beta (preview) endpoints
      const [v1Data, v1betaData] = await Promise.all([
        lastValueFrom(this.http.get<GoogleModelsResponse>(v1Url)).catch(() => ({ models: [] })),
        lastValueFrom(this.http.get<GoogleModelsResponse>(v1betaUrl)).catch(() => ({ models: [] }))
      ]);

      const filterModels = (data: GoogleModelsResponse) =>
        data?.models?.filter(model => model?.supportedGenerationMethods?.includes('generateContent')).map(model => model.name) || [];

      const v1Models = filterModels(v1Data);
      const v1betaModels = filterModels(v1betaData);

      // Combine and deduplicate models
      const allModels = [...new Set([...v1Models, ...v1betaModels])];

      const currentSettings = this.settings();
      this.settings.set({
        ...currentSettings,
        options: {
          ...currentSettings.options,
          [Provider.GOOGLE]: {
            ...currentSettings.options[Provider.GOOGLE],
            availableModels: allModels
          }
        }
      });
    } catch (e) {
      this.handleError(e, 'Error getting Google models');
    }
  }

  async getModelsFromXAI(): Promise<void> {
    if (!this.settings().options[Provider.XAI].apiKey) {
      return;
    }

    try {
      const data = await lastValueFrom(this.http.get<XaiModelsResponse>(API_ENDPOINTS.XAI, {
        headers: {
          'Authorization': `Bearer ${this.settings().options[Provider.XAI].apiKey}`
        }
      }));
      const currentSettings = this.settings();
      this.settings.set({
        ...currentSettings,
        options: {
          ...currentSettings.options,
          [Provider.XAI]: {
            ...currentSettings.options[Provider.XAI],
            availableModels: data?.data?.map(model => model.id) || []
          }
        }
      });
    } catch (e) {
      this.handleError(e, 'Error getting xAI models');
    }
  }

  public async getModels(provider: Provider): Promise<void> {
    try {
      switch (provider) {
        case Provider.OLLAMA:
          await this.getModelsFromOllama();
          break;
        case Provider.OPENAI:
          await this.getModelsFromOpenAI();
          break;
        case Provider.ANTHROPIC:
          await this.getModelsFromAnthropic();
          break;
        case Provider.MISTRAL:
          await this.getModelsFromMistral();
          break;
        case Provider.COHERE:
          await this.getModelsFromCohere();
          break;
        case Provider.GOOGLE:
          await this.getModelsFromGoogle();
          break;
        case Provider.XAI:
          await this.getModelsFromXAI();
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
    } catch (error) {
      this.handleError(error, `Failed to get models for ${provider}`);
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
