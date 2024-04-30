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

@Injectable({
  providedIn: 'root'
})
export class LcService {

  // Settings are saved into the local storage
  private settings: Settings = {
    provider: 'Ollama',
    options: {
      PROVIDER_OLLAMA: {
        provider: PROVIDER_OLLAMA,
        model: 'gpt2',
        apiKey: '',
        apiUrl: 'http://localhost:11434',
        temperature: 0.7,
        availableModels: []
      },
      PROVIDER_OPENAI: {
        provider: PROVIDER_OPENAI,
        model: 'gpt-3.5-turbo',
        apiKey: '',
        apiUrl: '',
        temperature: 0.7,
        availableModels: []
      },
      PROVIDER_ANTHROPIC: {
        provider: PROVIDER_ANTHROPIC,
        model: '',
        apiKey: '',
        apiUrl: '',
        temperature: 0.7,
        availableModels: []
      },
      PROVIDER_MISTRAL: {
        provider: PROVIDER_MISTRAL,
        model: '',
        apiKey: '',
        apiUrl: '',
        temperature: 0.7,
        availableModels: []
      }
    }
  };

  public providers = [
    PROVIDER_OLLAMA,
    PROVIDER_OPENAI,
    PROVIDER_ANTHROPIC,
    PROVIDER_MISTRAL
  ];

  public llm: Runnable = {} as Runnable;

  constructor(private http: HttpClient) { }

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
    this.settings.provider = options.provider;
    this.settings.options[options.provider] = options;
    this.saveSettings();
    this.createLLM();
  }

  // saveSettings saves the settings to the local storage
  private saveSettings() {
    localStorage.setItem('settings', JSON.stringify(this.settings));
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
    return this.llm.invoke(prompt);
  }

  // stream sends a prompt to the chatbot and returns a stream of responses
  stream(prompt: string) {
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
    const data: any = await lastValueFrom(this.http.get(this.settings.options['Ollama'].apiUrl + '/api/tags'));
    this.settings.options['Ollama'].availableModels = [] as string[];
    for (let model of data?.models as any[]) {
      this.settings.options['Ollama'].availableModels.push(model?.name);
    }
  }

  // Get OpenAI models from the server
  async getOpenAIModels(): Promise<void> {
    if (!this.settings.options[PROVIDER_OPENAI].apiKey) {
      console.info('Aborting getOpenAIModels because there is no API key');
      return;
    }
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
  }

  getAnthropicModels() {
    this.settings.options[PROVIDER_ANTHROPIC].availableModels = ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'];
  }

  async getMistralModels(): Promise<void> {
    if (!this.settings.options[PROVIDER_MISTRAL].apiKey) {
      console.info('Aborting getOpenAIModels because there is no API key');
      return;
    }
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
  }


  // streamWithTemplate sends a prompt to the chatbot with a template and returns a stream of responses
  streamWithSystemPrompt(system: string, prompt: string) {
    let template = system + ` ${prompt}`
    let tpl = PromptTemplate.fromTemplate(template);
    let chain = tpl.pipe(this.llm);
    return chain.stream({ prompt: prompt });
  }
}
