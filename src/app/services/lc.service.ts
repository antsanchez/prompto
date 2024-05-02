import { Injectable } from '@angular/core';
import { ChatOllama } from "@langchain/community/chat_models/ollama";
import { PromptTemplate } from "@langchain/core/prompts";
import { HttpClient } from '@angular/common/http';
import { Runnable } from '@langchain/core/runnables';
import { ChatOpenAI } from "@langchain/openai";
import { ChatMistralAI } from "@langchain/mistralai";
import { ChatAnthropic } from "@langchain/anthropic";
import { lastValueFrom } from 'rxjs';

export type Settings = {
  provider: string;
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

const PROVIDER_OLLAMA = 'Ollama';
const PROVIDER_OPENAI = 'OpenAI';
const PROVIDER_ANTHROPIC = 'Anthropic';
const PROVIDER_MISTRAL = 'Mistral';

const DEFAULT_SETTINGS: Settings = {
  provider: PROVIDER_OLLAMA,
  options: {
    [PROVIDER_OLLAMA]: {
      provider: PROVIDER_OLLAMA,
      model: 'llama3',
      apiKey: '',
      apiUrl: 'http://localhost:11434',
      temperature: 0.7,
      availableModels: []
    },
    [PROVIDER_OPENAI]: {
      provider: PROVIDER_OPENAI,
      model: 'gpt-3.5-turbo',
      apiKey: '',
      apiUrl: '',
      temperature: 0.7,
      availableModels: []
    },
    [PROVIDER_ANTHROPIC]: {
      provider: PROVIDER_ANTHROPIC,
      model: '',
      apiKey: '',
      apiUrl: '',
      temperature: 0.7,
      availableModels: []
    },
    [PROVIDER_MISTRAL]: {
      provider: PROVIDER_MISTRAL,
      model: '',
      apiKey: '',
      apiUrl: '',
      temperature: 0.7,
      availableModels: []
    }
  }
}


@Injectable({
  providedIn: 'root'
})
export class LcService {

  // Settings are saved into the local storage
  private settings: Settings = {} as Settings;
  private connected: boolean = false;

  public providers = [
    PROVIDER_OLLAMA,
    PROVIDER_OPENAI,
    PROVIDER_ANTHROPIC,
    PROVIDER_MISTRAL
  ];

  public llm: Runnable = {} as Runnable;

  constructor(private http: HttpClient) {
    this.setDefaultSettings();
  }

  setDefaultSettings() {
    this.settings = DEFAULT_SETTINGS;
  }

  isConnected(): boolean {
    if (!this.llm) {
      return false;
    }
    // Exception for Anthropic, since we are not getting the models from the server prior to the conversations
    if (!this.connected && this.settings.provider !== PROVIDER_ANTHROPIC) {
      console.log('Not connected', this.connected, this.settings.provider);
      return false;
    }
    if (this.settings.options[this.settings.provider].availableModels.length === 0) {
      return false;
    }
    return true;
  }

  createLLM(): Error | void {
    switch (this.settings.provider) {
      case PROVIDER_OPENAI:
        if (!this.settings.options[PROVIDER_OPENAI].apiKey) {
          return new Error('No API key');
        }
        this.llm = new ChatOpenAI({
          apiKey: this.settings.options[PROVIDER_OPENAI].apiKey,
          model: this.settings.options[PROVIDER_OPENAI].model,
          temperature: this.settings.options[PROVIDER_OPENAI].temperature,
        });
        return;
      case PROVIDER_OLLAMA:
        this.llm = new ChatOllama({
          baseUrl: this.settings.options[PROVIDER_OLLAMA].apiUrl,
          model: this.settings.options[PROVIDER_OLLAMA].model,
          temperature: this.settings.options[PROVIDER_OLLAMA].temperature,
        });
        return;
      case PROVIDER_ANTHROPIC:
        if (!this.settings.options[this.settings.provider].apiKey) {
          return new Error('No API key');
        }
        this.llm = new ChatAnthropic({
          apiKey: this.settings.options[PROVIDER_ANTHROPIC].apiKey,
          model: this.settings.options[PROVIDER_ANTHROPIC].model,
          temperature: this.settings.options[PROVIDER_ANTHROPIC].temperature,
        });
        return
      case PROVIDER_MISTRAL:
        if (!this.settings.options[this.settings.provider].apiKey) {
          return new Error('No API key');
        }
        this.llm = new ChatMistralAI({
          apiKey: this.settings.options[PROVIDER_MISTRAL].apiKey,
          model: this.settings.options[PROVIDER_MISTRAL].model,
          temperature: this.settings.options[PROVIDER_MISTRAL].temperature,
        });
        return
    }
  }

  // getProvider returns the provider
  getProvider(): string {
    return this.settings.provider;
  }

  // setProvider sets the provider and creates the LLM
  setProvider(provider: string) {
    this.settings.provider = provider;
    this.createLLM();
  }

  // getModel returns the model
  getModel(): string {
    return this.settings.options[this.settings.provider]?.model || '';
  }

  // getOptions returns the options for the provider
  getOptions() {
    return this.settings.options[this.settings.provider];
  }

  // getOptionsFromProvider returns the options for the provider
  getOptionsFromProvider(provider: string) {
    return this.settings.options[provider];
  }

  // getAvailableModels returns the available models for the provider
  getAvailableModels(provider: string) {
    return this.settings.options[provider].availableModels;
  }

  // This function is used to set the API key temporarily, in order to be able to get the models
  setApiKeyTemporarily(provider: string, apiKey: string) {
    this.settings.options[provider].apiKey = apiKey;
  }

  // setOptions sets the options for the provider
  setOptions(options: Options) {
    const { provider } = options;
    if (!this.providers.includes(provider)) {
      throw new Error(`Unsupported provider: ${provider}`);
    }
    this.settings.provider = provider;
    this.settings.options[provider] = options;
    this.saveSettings();
    this.createLLM();
  }

  // saveSettings saves the settings to the local storage
  private saveSettings() {
    localStorage.setItem('settings', JSON.stringify(this.settings));
  }

  // clearOptions clears the options for the provider
  clearOptions() {
    this.removeSettings();
    this.setDefaultSettings();
    this.createLLM();
  }

  // removeSettings removes the settings from the local storage
  private removeSettings() {
    localStorage.removeItem('settings');
  }

  // loadSettings loads the settings from the local storage
  loadSettings() {
    let settings = localStorage.getItem('settings');
    if (settings) {
      this.settings = JSON.parse(settings) as Settings;
    }
  }

  // invoke sends a prompt to the chatbot and returns the response
  invoke(prompt: string): Promise<string> {
    if (!this.llm) {
      this.connected = false;
      throw new Error('LLM not initialized');
    }
    return this.llm.invoke(prompt);
  }

  // stream sends a prompt to the chatbot and returns a stream of responses
  stream(prompt: string) {
    if (!this.llm) {
      this.connected = false;
      throw new Error('LLM not initialized');
    }
    return this.llm.stream(prompt);
  }

  async getModels(provider: string): Promise<void> {
    switch (provider) {
      case 'Ollama':
        await this.getOllamaModels();
        break;
      case PROVIDER_OPENAI:
        await this.getOpenAIModels();
        break;
      case PROVIDER_ANTHROPIC:
        this.getAnthropicModels();
        break;
      case PROVIDER_MISTRAL:
        await this.getMistralModels();
        break;
    }
  }


  // Get ollama models from the server
  async getOllamaModels(): Promise<void> {
    const url = this.settings.options['Ollama'].apiUrl + '/api/tags';
    try {
      const data: any = await lastValueFrom(this.http.get(url));
      this.settings.options['Ollama'].availableModels = [] as string[];
      for (let model of data?.models as any[]) {
        this.settings.options['Ollama'].availableModels.push(model?.name);
      }
      this.connected = true;
    } catch (e) {
      this.connected = false;
      console.error('Error getting Ollama models:', e);
      throw new Error('Error getting Ollama models');
    }
  }

  // Get OpenAI models from the server
  async getOpenAIModels(): Promise<void> {
    if (!this.settings.options[PROVIDER_OPENAI].apiKey) {
      console.info('Aborting getOpenAIModels because there is no API key');
      return;
    }
    try {
      const url = 'https://api.openai.com/v1/engines';
      const data = await lastValueFrom(this.http.get(url, {
        headers: {
          'Authorization': `Bearer ${this.settings.options[PROVIDER_OPENAI].apiKey}`
        }
      })) as any;
      this.settings.options[PROVIDER_OPENAI].availableModels = [];
      for (let model of data?.data as any[]) {
        this.settings.options[PROVIDER_OPENAI].availableModels.push(model?.id);
      }
      this.connected = true;
    } catch (e) {
      this.connected = false;
      console.error('Error getting OpenAI models:', e);
      throw new Error('Error getting OpenAI models');
    }

  }

  getAnthropicModels() {
    this.settings.options[PROVIDER_ANTHROPIC].availableModels = ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'];
  }

  async getMistralModels(): Promise<void> {
    if (!this.settings.options[PROVIDER_MISTRAL].apiKey) {
      console.info('Aborting getOpenAIModels because there is no API key');
      return;
    }
    try {
      const url = 'https://api.mistralai.com/v1/models';
      const data = await lastValueFrom(this.http.get(url, {
        headers: {
          'Authorization': `Bearer ${this.settings.options[PROVIDER_MISTRAL].apiKey}`
        }
      })) as any;
      this.settings.options[PROVIDER_MISTRAL].availableModels = [];
      for (let model of data?.data as any[]) {
        this.settings.options[PROVIDER_MISTRAL].availableModels.push(model?.id);
      }
      this.connected = true;
    } catch (e) {
      this.connected = false;
      console.error('Error getting Mistral models:', e);
      throw new Error('Error getting Mistral models');
    }
  }


  // streamWithTemplate sends a prompt to the chatbot with a template and returns a stream of responses
  streamWithSystemPrompt(system: string, prompt: string) {
    let tpl = PromptTemplate.fromTemplate(`System prompt: ${system}\n\n${prompt}\n\nResponse:`);
    let chain = tpl.pipe(this.llm);
    return chain.stream({ system: system, prompt: prompt });
  }
}
