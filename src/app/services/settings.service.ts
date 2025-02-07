import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { signal } from '@angular/core';

export enum Provider {
  OLLAMA = 'Ollama',
  OPENAI = 'OpenAI',
  ANTHROPIC = 'Anthropic',
  MISTRAL = 'Mistral',
  COHERE = 'Cohere',
  GOOGLE = 'Google'
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

const DEFAULT_TEMPERATURE = 0.7;

const DEFAULT_SETTINGS: Settings = {
  provider: Provider.OLLAMA,
  enterSubmit: false,
  options: {
    [Provider.OLLAMA]: {
      provider: Provider.OLLAMA,
      model: 'llama3',
      apiKey: '',
      apiUrl: 'http://localhost:11434',
      temperature: DEFAULT_TEMPERATURE,
      availableModels: []
    },
    [Provider.OPENAI]: {
      provider: Provider.OPENAI,
      model: 'gpt-4.5-turbo',
      apiKey: '',
      apiUrl: '',
      temperature: DEFAULT_TEMPERATURE,
      availableModels: []
    },
    [Provider.ANTHROPIC]: {
      provider: Provider.ANTHROPIC,
      model: 'claude-3-5-sonnet-20240620',
      apiKey: '',
      apiUrl: '',
      temperature: DEFAULT_TEMPERATURE,
      availableModels: []
    },
    [Provider.MISTRAL]: {
      provider: Provider.MISTRAL,
      model: '',
      apiKey: '',
      apiUrl: '',
      temperature: DEFAULT_TEMPERATURE,
      availableModels: []
    },
    [Provider.COHERE]: {
      provider: Provider.COHERE,
      model: '',
      apiKey: '',
      apiUrl: '',
      temperature: DEFAULT_TEMPERATURE,
      availableModels: []
    },
    [Provider.GOOGLE]: {
      provider: Provider.GOOGLE,
      model: '',
      apiKey: '',
      apiUrl: '',
      temperature: DEFAULT_TEMPERATURE,
      availableModels: []
    },
  }
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService implements ISettingsService {
  // Change from private to public and rename
  public readonly settings = signal<Settings>({} as Settings);
  public readonly savedDiscussionsSignal = signal<number>(0);
  public readonly savedDiscussions$ = this.savedDiscussionsSignal.asReadonly();

  private connectionChecked: boolean = false;
  private connected: boolean = false;

  public chats: Keys[] = [] as Keys[];
  public currentChatKey: string = "";

  public arenas: Keys[] = [] as Keys[];
  public currentArenaKey: string = "";

  public discussions: Keys[] = [] as Keys[];
  public currentDiscussionKey: string = "";

  public templates: System[] = [] as System[];
  public currentTemplateName: string = "";

  constructor(private http: HttpClient) { }

  private handleError(error: unknown, message: string): never {
    if (error instanceof Error) {
      throw new Error(`${message}: ${error.message}`);
    }
    throw new Error(message);
  }

  public loadSettings(): void {
    let settings = localStorage.getItem('settings');
    if (settings) {
      this.settings.set(JSON.parse(settings) as Settings);
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
    localStorage.setItem('settings', JSON.stringify(this.settings()));
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
    localStorage.removeItem('settings');
    this.setDefaultSettings();
  }

  public getTemperature(): number {
    return this.settings().options[this.getProvider()]?.temperature || DEFAULT_TEMPERATURE;
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
      const data: any = await lastValueFrom(this.http.get(url));
      const currentSettings = this.settings();
      this.settings.set({
        ...currentSettings,
        options: {
          ...currentSettings.options,
          [Provider.OLLAMA]: {
            ...currentSettings.options[Provider.OLLAMA],
            availableModels: data?.models?.map((model: any) => model.name) || []
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
      const url = 'https://api.openai.com/v1/engines';
      const data = await lastValueFrom(this.http.get(url, {
        headers: {
          'Authorization': `Bearer ${this.settings().options[Provider.OPENAI].apiKey}`
        }
      })) as any;
      const currentSettings = this.settings();
      this.settings.set({
        ...currentSettings,
        options: {
          ...currentSettings.options,
          [Provider.OPENAI]: {
            ...currentSettings.options[Provider.OPENAI],
            availableModels: data?.data?.map((model: any) => model.id) || []
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
      const url = 'https://api.anthropic.com/v1/models';
      const data = await lastValueFrom(this.http.get(url, {
        headers: {
          'x-api-key': `${this.settings().options[Provider.ANTHROPIC].apiKey}`,
          'anthropic-version': '2023-06-01'
        }
      })) as any;

      const currentSettings = this.settings();
      this.settings.set({
        ...currentSettings,
        options: {
          ...currentSettings.options,
          [Provider.ANTHROPIC]: {
            ...currentSettings.options[Provider.ANTHROPIC],
            availableModels: data?.models?.map((model: any) => model.id) || []
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
      const url = 'https://api.mistralai.com/v1/models';
      const data = await lastValueFrom(this.http.get(url, {
        headers: {
          'Authorization': `Bearer ${this.settings().options[Provider.MISTRAL].apiKey}`
        }
      })) as any;
      const currentSettings = this.settings();
      this.settings.set({
        ...currentSettings,
        options: {
          ...currentSettings.options,
          [Provider.MISTRAL]: {
            ...currentSettings.options[Provider.MISTRAL],
            availableModels: data?.data?.map((model: any) => model.id) || []
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
      const url = 'https://api.cohere.ai/v1/models';
      const data = await lastValueFrom(this.http.get(url, {
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${this.settings().options[Provider.COHERE].apiKey}`
        }
      })) as any;
      const currentSettings = this.settings();
      this.settings.set({
        ...currentSettings,
        options: {
          ...currentSettings.options,
          [Provider.COHERE]: {
            ...currentSettings.options[Provider.COHERE],
            availableModels: data?.models?.map((model: any) => model.name) || []
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
      const url = 'https://generativelanguage.googleapis.com/v1/models';
      const data = await lastValueFrom(this.http.get(`${url}?key=${this.settings().options[Provider.GOOGLE].apiKey}`)) as any;

      const currentSettings = this.settings();
      this.settings.set({
        ...currentSettings,
        options: {
          ...currentSettings.options,
          [Provider.GOOGLE]: {
            ...currentSettings.options[Provider.GOOGLE],
            availableModels: data?.models?.filter((model: any) => model?.supportedGenerationMethods?.includes('generateContent')).map((model: any) => model.name) || []
          }
        }
      });
    } catch (e) {
      this.handleError(e, 'Error getting Google models');
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
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
    } catch (error) {
      this.handleError(error, `Failed to get models for ${provider}`);
    }
  }

  loadKeys(): void {
    this.chats = [] as Keys[];
    this.loadChatsFromStorage();

    this.arenas = [] as Keys[];
    this.loadArenasFromStorage();

    this.discussions = [] as Keys[];
    this.loadDiscussionsFromStorage();

    // Update the signal by incrementing its value
    this.savedDiscussionsSignal.set(this.savedDiscussionsSignal() + 1);
  }

  private loadChatsFromStorage(): void {
    for (let i = 0; i < localStorage.length; i++) {
      let key = localStorage.key(i);
      if (key && key.startsWith("chat_")) {
        try {
          let chat = localStorage.getItem(key);
          if (chat) {
            let chatObj = JSON.parse(chat);
            this.chats.push({
              key: key,
              name: chatObj.title || 'Untitled Chat'
            });
          }
        } catch (error) {
          console.error('Error loading chat:', error);
        }
      }
    }
  }

  private loadArenasFromStorage(): void {
    for (let i = 0; i < localStorage.length; i++) {
      let key = localStorage.key(i);
      if (key && key.startsWith("arena_")) {
        try {
          let arena = localStorage.getItem(key);
          if (arena) {
            let arenaObj = JSON.parse(arena);
            this.arenas.push({
              key: key,
              name: arenaObj.title || 'Untitled Arena'
            });
          }
        } catch (error) {
          console.error('Error loading arena:', error);
        }
      }
    }
  }

  private loadDiscussionsFromStorage(): void {
    for (let i = 0; i < localStorage.length; i++) {
      let key = localStorage.key(i);
      if (key && key.startsWith("discussion_")) {
        try {
          let discussion = localStorage.getItem(key);
          if (discussion) {
            let discussionObj = JSON.parse(discussion);
            this.discussions.push({
              key: key,
              name: discussionObj.title || 'Untitled Discussion'
            });
          }
        } catch (error) {
          console.error('Error loading discussion:', error);
        }
      }
    }
  }

  public loadTemplates(): void {
    let tmpl = localStorage.getItem('templates');
    if (tmpl === null) {
      this.templates = [] as System[];
    } else {
      this.templates = JSON.parse(tmpl);
    }
  }

  public deleteArena(key: string): void {
    localStorage.removeItem(key);
    this.arenas = this.arenas.filter((arena) => arena.key !== key);
    if (this.currentArenaKey === key) {
      this.currentArenaKey = "";
    }
  }

  public deleteChat(key: string): void {
    localStorage.removeItem(key);
    this.chats = this.chats.filter((chat) => chat.key !== key);
    if (this.currentChatKey === key) {
      this.currentChatKey = "";
    }
  }

  public deleteTemplate(name: string): void {
    this.loadTemplates();
    this.templates = this.templates.filter((template) => template.name !== name);
    localStorage.setItem('templates', JSON.stringify(this.templates));
  }

  public deleteDiscussion(key: string): void {
    localStorage.removeItem(key);
    this.discussions = this.discussions.filter((discussion) => discussion.key !== key);
    if (this.currentDiscussionKey === key) {
      this.currentDiscussionKey = "";
    }
  }

  public deleteAll(): void {
    for (let i = 0; i < localStorage.length; i++) {
      let key = localStorage.key(i);
      if (key && key.startsWith("chat_")) {
        localStorage.removeItem(key);
      }
    }
    this.currentChatKey = "";
    this.chats = [] as Keys[];

    for (let i = 0; i < localStorage.length; i++) {
      let key = localStorage.key(i);
      if (key && key.startsWith("arena_")) {
        localStorage.removeItem(key);
      }
    }
    this.currentArenaKey = "";
    this.arenas = [] as Keys[];

    localStorage.removeItem('templates');
    this.templates = [] as System[];

    for (let i = 0; i < localStorage.length; i++) {
      let key = localStorage.key(i);
      if (key && key.startsWith("discussion_")) {
        localStorage.removeItem(key);
      }
    }

    this.clearAndResetOptions();
  }
}
