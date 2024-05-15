import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';

export type Keys = {
  key: string;
  name: string;
};

export type System = {
  name: string;
  system: string;
};

export type Settings = {
  provider: string;
  enterSubmit: boolean;
  options: { [provider: string]: Options }
};

export type Options = {
  provider: string;
  model: string;
  apiKey: string;
  apiUrl: string;
  temperature?: number;
  availableModels: string[];
};

export const PROVIDERS = {
  OLLAMA: 'Ollama',
  OPENAI: 'OpenAI',
  ANTHROPIC: 'Anthropic',
  MISTRAL: 'Mistral',
  COHERE: 'Cohere'
};

const DEFAULT_TEMPERATURE = 0.7;

const DEFAULT_SETTINGS: Settings = {
  provider: PROVIDERS.OLLAMA,
  enterSubmit: false,
  options: {
    [PROVIDERS.OLLAMA]: {
      provider: PROVIDERS.OLLAMA,
      model: 'llama3',
      apiKey: '',
      apiUrl: 'http://localhost:11434',
      temperature: DEFAULT_TEMPERATURE,
      availableModels: []
    },
    [PROVIDERS.OPENAI]: {
      provider: PROVIDERS.OPENAI,
      model: 'gpt-3.5-turbo',
      apiKey: '',
      apiUrl: '',
      temperature: DEFAULT_TEMPERATURE,
      availableModels: []
    },
    [PROVIDERS.ANTHROPIC]: {
      provider: PROVIDERS.ANTHROPIC,
      model: 'claude-3-opus-20240229',
      apiKey: '',
      apiUrl: '',
      temperature: DEFAULT_TEMPERATURE,
      availableModels: []
    },
    [PROVIDERS.MISTRAL]: {
      provider: PROVIDERS.MISTRAL,
      model: '',
      apiKey: '',
      apiUrl: '',
      temperature: DEFAULT_TEMPERATURE,
      availableModels: []
    },
    [PROVIDERS.COHERE]: {
      provider: PROVIDERS.COHERE,
      model: '',
      apiKey: '',
      apiUrl: '',
      temperature: DEFAULT_TEMPERATURE,
      availableModels: []
    }
  }
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {

  // Settings are saved into the local storage
  public settings: Settings = {} as Settings;
  private connectionChecked: boolean = false;
  private connected: boolean = false;

  public chats: Keys[] = [] as Keys[];
  public currentChatKey: string = "";

  public arenas: Keys[] = [] as Keys[];
  public currentArenaKey: string = "";

  public templates: System[] = [] as System[];
  public currentTemplateName: string = "";

  constructor(private http: HttpClient) { }

  // loadSettings loads the settings from the local storage
  public loadSettings() {
    let settings = localStorage.getItem('settings');
    if (settings) {
      this.settings = JSON.parse(settings) as Settings;
    }

    // Check if the settings are empty
    if (Object.keys(this.settings).length === 0) {
      this.setDefaultSettings();
    }

    for (let provider of this.listProviders()) {
      if (!this.settings.options[provider]) {
        this.settings.options[provider] = DEFAULT_SETTINGS.options[provider];
      }
    }
  }

  // getSettings sets the default settings
  public setDefaultSettings() {
    this.settings = DEFAULT_SETTINGS;
  }

  // saveSettings saves the settings to the local storage
  public saveSettings() {
    localStorage.setItem('settings', JSON.stringify(this.settings));
  }

  // setOptions sets the options for the provider
  public setOptions(options: Options) {
    if (!this.listProviders().includes(options.provider)) {
      throw new Error(`setOptions Unsupported provider: ${options.provider}`);
    }
    this.settings.provider = options.provider;
    this.settings.options[options.provider] = options;
    this.saveSettings();
  }

  // setEnterSubmit sets the enterSubmit setting
  public setEnterSubmit(enterSubmit: boolean) {
    this.settings.enterSubmit = enterSubmit;
    this.saveSettings();
  }

  // getProvider returns the provider
  public getProvider(): string {
    return this.settings.provider;
  }

  // getModel returns the model
  public getModel(): string {
    return this.settings.options[this.getProvider()]?.model || '';
  }

  // getOptions returns the options for the provider
  public getOptions() {
    return this.settings.options[this.getProvider()];
  }

  // clearAndResetOptions clears and resets the options 
  public clearAndResetOptions() {
    localStorage.removeItem('settings');
    this.setDefaultSettings();
  }

  // getTemperature returns the temperature
  public getTemperature(): number {
    return this.settings.options[this.getProvider()]?.temperature || DEFAULT_TEMPERATURE;
  }

  // listProviders returns the list of providers from the PROVIDERS object
  public listProviders(): string[] {
    return Object.values(PROVIDERS);
  }

  // getOptionsFromProvider returns the options for the provider
  public getOptionsFromProvider(provider: string) {
    return this.settings.options[provider];
  }

  // getAvailableModels returns the available models for the provider
  public getAvailableModels(provider: string) {
    return this.settings.options[provider].availableModels;
  }

  // This function is used to set the API key temporarily, in order to be able to get the models
  public setApiKeyTemporarily(provider: string, apiKey: string) {
    this.settings.options[provider].apiKey = apiKey;
  }

  // setConnected sets the connection status
  public setConnected(connected: boolean) {
    this.connectionChecked = true;
    this.connected = connected;
  }

  // checkConnection checks if the service is connected, and connects if it is not
  public checkConnection() {
    if (!this.connectionChecked) {
      try {
        this.getModels(this.getProvider());
        this.setConnected(true);
      } catch (error) {
        this.setConnected(false);
      }
    }
  }

  // isConnected returns true if the the service is connected
  public isConnected(): boolean {
    if (!this.connected && this.connectionChecked) {
      console.log('Not connected')
      return false;
    }
    if (this.settings.options[this.getProvider()].availableModels.length === 0) {
      return false;
    }
    return true;
  }

  // Get ollama models from the server
  async getModelsFromOllama(): Promise<void> {
    const url = this.settings.options[PROVIDERS.OLLAMA].apiUrl + '/api/tags';
    try {
      const data: any = await lastValueFrom(this.http.get(url));
      this.settings.options[PROVIDERS.OLLAMA].availableModels = [] as string[];
      for (let model of data?.models as any[]) {
        this.settings.options[PROVIDERS.OLLAMA].availableModels.push(model?.name);
      }
    } catch (e) {
      console.error('Error getting Ollama models:', e);
      throw new Error('Error getting Ollama models');
    }
  }

  // Get OpenAI models from the server
  async getModelsFromOpenAI(): Promise<void> {
    if (!this.settings.options[PROVIDERS.OPENAI].apiKey) {
      console.info('Aborting getOpenAIModels because there is no API key');
      return;
    }
    try {
      const url = 'https://api.openai.com/v1/engines';
      const data = await lastValueFrom(this.http.get(url, {
        headers: {
          'Authorization': `Bearer ${this.settings.options[PROVIDERS.OPENAI].apiKey}`
        }
      })) as any;
      this.settings.options[PROVIDERS.OPENAI].availableModels = [];
      for (let model of data?.data as any[]) {
        this.settings.options[PROVIDERS.OPENAI].availableModels.push(model?.id);
      }
    } catch (e) {
      console.error('Error getting OpenAI models:', e);
      throw new Error('Error getting OpenAI models');
    }

  }

  // Get Anthropic models (hardcoded for now, since there is no API to get the models)
  getModelsFromAnthropic() {
    this.settings.options[PROVIDERS.ANTHROPIC].availableModels = ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'];
  }

  // Get Mistral models from the server
  async getModelsFromMistral(): Promise<void> {
    if (!this.settings.options[PROVIDERS.MISTRAL].apiKey) {
      console.info('Aborting getOpenAIModels because there is no API key');
      return;
    }
    try {
      const url = 'https://api.mistralai.com/v1/models';
      const data = await lastValueFrom(this.http.get(url, {
        headers: {
          'Authorization': `Bearer ${this.settings.options[PROVIDERS.MISTRAL].apiKey}`
        }
      })) as any;
      this.settings.options[PROVIDERS.MISTRAL].availableModels = [];
      for (let model of data?.data as any[]) {
        this.settings.options[PROVIDERS.MISTRAL].availableModels.push(model?.id);
      }
    } catch (e) {
      console.error('Error getting Mistral models:', e);
      throw new Error('Error getting Mistral models');
    }
  }

  // Get Cohere models from the server
  async getModelsFromCohere(): Promise<void> {
    if (!this.settings.options[PROVIDERS.COHERE].apiKey) {
      console.info('Aborting getCohereModels because there is no API key');
      return;
    }

    try {
      const url = 'https://api.cohere.ai/v1/models';
      const data = await lastValueFrom(this.http.get(url, {
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${this.settings.options[PROVIDERS.COHERE].apiKey}`
        }
      })) as any;
      this.settings.options[PROVIDERS.COHERE].availableModels = [];
      for (let model of data?.models as any[]) {
        this.settings.options[PROVIDERS.COHERE].availableModels.push(model?.name);
      }
    } catch (e) {
      console.error('Error getting Cohere models:', e);
      throw new Error('Error getting Cohere models');
    }
  }

  // getModels gets the models from the server
  async getModels(provider: string): Promise<void> {
    switch (provider) {
      case PROVIDERS.OLLAMA:
        await this.getModelsFromOllama();
        break;
      case PROVIDERS.OPENAI:
        await this.getModelsFromOpenAI();
        break;
      case PROVIDERS.ANTHROPIC:
        this.getModelsFromAnthropic();
        break;
      case PROVIDERS.MISTRAL:
        await this.getModelsFromMistral();
        break;
      case PROVIDERS.COHERE:
        await this.getModelsFromCohere();
        break;
    }
  }

  // load all chat names from local storage
  loadKeys() {
    this.chats = [] as Keys[];
    for (let i = 0; i < localStorage.length; i++) {
      let key = localStorage.key(i);
      if (key && key.startsWith("chat_")) {
        let chat = localStorage.getItem(key);
        if (chat) {
          let chatObj = JSON.parse(chat);
          this.chats.push({
            key: key,
            name: chatObj.name
          });
        }
      }
    }

    this.arenas = [] as Keys[];
    for (let i = 0; i < localStorage.length; i++) {
      let key = localStorage.key(i);
      if (key && key.startsWith("arena_")) {
        let arena = localStorage.getItem(key);
        if (arena) {
          let arenaObj = JSON.parse(arena);
          this.arenas.push({
            key: key,
            name: arenaObj.name
          });
        }
      }
    }
  }

  // get retrieves the templates from local storage
  public loadTemplates() {
    let tmpl = localStorage.getItem('templates');
    if (tmpl === null) {
      this.templates = [] as System[];
    } else {
      this.templates = JSON.parse(tmpl);
    }
  }

  // deleteArena deletes the arena from local storage
  public deleteArena(key: string) {
    localStorage.removeItem(key);
    this.arenas = this.arenas.filter((arena) => arena.key !== key);
    if (this.currentArenaKey === key) {
      this.currentArenaKey = "";
    }
  }

  // delete chat from local storage
  public deleteChat(key: string) {
    localStorage.removeItem(key);
    this.chats = this.chats.filter((chat) => chat.key !== key);
    if (this.currentChatKey === key) {
      this.currentChatKey = "";
    }
  }

  // deleteTemplate deletes the template from local storage
  public deleteTemplate(name: string) {
    this.loadTemplates();
    this.templates = this.templates.filter((template) => template.name !== name);
    localStorage.setItem('templates', JSON.stringify(this.templates));
  }

  public deleteAll() {
    // Chats 
    for (let i = 0; i < localStorage.length; i++) {
      let key = localStorage.key(i);
      if (key && key.startsWith("chat_")) {
        localStorage.removeItem(key);
      }
    }
    this.currentChatKey = "";
    this.chats = [] as Keys[];

    // Arenas
    for (let i = 0; i < localStorage.length; i++) {
      let key = localStorage.key(i);
      if (key && key.startsWith("arena_")) {
        localStorage.removeItem(key);
      }
    }
    this.currentArenaKey = "";
    this.arenas = [] as Keys[];

    // Templates
    localStorage.removeItem('templates');
    this.templates = [] as System[];

    // Options
    this.clearAndResetOptions();
  }
}
