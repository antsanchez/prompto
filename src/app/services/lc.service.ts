import { Injectable } from '@angular/core';
import { Ollama } from "@langchain/community/llms/ollama";
import { PromptTemplate } from "@langchain/core/prompts";
import { HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { ChatOpenAI } from "@langchain/openai";
import { Runnable } from '@langchain/core/runnables';
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
  availableModels: string[];
};

@Injectable({
  providedIn: 'root'
})
export class LcService {

  // Settings are saved into the local storage
  private settings: Settings = {
    provider: 'Ollama',
    options: {
      'Ollama': {
        provider: 'Ollama',
        model: 'gpt2',
        apiKey: '',
        apiUrl: 'http://localhost:11434',
        availableModels: []
      },
      'OpenAI': {
        provider: 'OpenAI',
        model: 'gpt-3.5-turbo',
        apiKey: '',
        apiUrl: '',
        availableModels: []
      },
      'Anthropic': {
        provider: 'Anthropic',
        model: '',
        apiKey: '',
        apiUrl: '',
        availableModels: []
      },
    }
  };

  public providers = [
    'Ollama',
    'OpenAI',
    'Anthropic'
  ];

  public llm: Runnable = {} as Runnable;

  constructor(private http: HttpClient) { }

  createLLM(): void {
    switch (this.settings.provider) {
      case 'OpenAI':
        if (!this.settings.options['OpenAI'].apiKey) {
          console.info('Aborting OpenAI because there is no API key');
          return;
        }
        try {
          this.llm = new ChatOpenAI({
            apiKey: this.settings.options[this.settings.provider].apiKey,
            model: this.settings.options[this.settings.provider].model,
          });
        } catch (error) {
          console.error('There was an error!', error);
        }
        return;
      case 'Ollama':
        try {
          this.llm = new Ollama({
            baseUrl: this.settings.options[this.settings.provider].apiUrl,
            model: this.settings.options[this.settings.provider].model,
          });
        } catch (error) {
          console.error('There was an error!', error);
        }
        return;
      case 'Anthropic':
        if (!this.settings.options[this.settings.provider].apiKey) {
          console.info('Aborting Anthropic because there is no API key');
          return;
        }
        this.llm = new ChatAnthropic({
          apiKey: this.settings.options[this.settings.provider].apiKey,
        });
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
      this.settings = JSON.parse(settings);
    }

    this.createLLM();
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
      case 'OpenAI':
        await this.getOpenAIModels();
        break;
    }
  }

  // Get ollama models from the server
  async getOllamaModels(): Promise<void> {
    try {
      const data: any = await lastValueFrom(this.http.get(this.settings.options['Ollama'].apiUrl + '/api/tags'));
      this.settings.options['Ollama'].availableModels = [] as string[];
      for (let model of data?.models as any[]) {
        this.settings.options['Ollama'].availableModels.push(model?.name);
      }
    } catch (error) {
      console.error('There was an error!', error);
    }
  }

  // Get OpenAI models from the server
  async getOpenAIModels(): Promise<void> {
    if (!this.settings.options['OpenAI'].apiKey) {
      console.info('Aborting getOpenAIModels because there is no API key');
      return;
    }
    const url = 'https://api.openai.com/v1/engines';
    try {
      const data = await lastValueFrom(this.http.get(url, {
        headers: {
          'Authorization': `Bearer ${this.settings.options['OpenAI'].apiKey}`
        }
      })) as any;
      this.settings.options['OpenAI'].availableModels = [];
      for (let model of data?.data as any[]) {
        this.settings.options['OpenAI'].availableModels.push(model?.id);
      }
    } catch (error) {
      console.error('There was an error!', error);
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
