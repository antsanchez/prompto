import { Injectable } from '@angular/core';
import { PromptTemplate } from "@langchain/core/prompts";
import { Runnable } from '@langchain/core/runnables';
import { PROVIDERS, SettingsService } from './settings.service';


@Injectable({
  providedIn: 'root'
})
export class LcService {

  // Settings are saved into the local storage
  private cache: { [key: string]: any } = {};

  public llm: Runnable = {} as Runnable;

  constructor(public s: SettingsService) {
    this.s.setDefaultSettings();
  }

  // createLLM creates the LLM based on the provider
  async createLLM(provider: string, model: string = ''): Promise<Runnable> {
    if (model === '' || !model) {
      model = this.s.settings.options[provider].model;
    }

    // Check if the class is already cached
    if (this.cache[provider]) {
      return new this.cache[provider]({
        apiKey: this.s.settings.options[provider].apiKey,
        model: model,
        temperature: this.s.settings.options[provider].temperature,
        baseUrl: this.s.settings.options[provider].apiUrl,
      });
    }

    switch (provider) {
      case PROVIDERS.OPENAI:
        if (!this.s.settings.options[PROVIDERS.OPENAI].apiKey) {
          throw new Error('No API key');
        }
        const { ChatOpenAI } = await import('@langchain/openai');
        this.cache[PROVIDERS.OPENAI] = ChatOpenAI;
        return new ChatOpenAI({
          apiKey: this.s.settings.options[PROVIDERS.OPENAI].apiKey,
          model: model,
          temperature: this.s.settings.options[PROVIDERS.OPENAI].temperature,
        });
      case PROVIDERS.OLLAMA:
        const { ChatOllama } = await import('@langchain/community/chat_models/ollama');
        this.cache[PROVIDERS.OLLAMA] = ChatOllama;
        return new ChatOllama({
          baseUrl: this.s.settings.options[PROVIDERS.OLLAMA].apiUrl,
          model: model,
          temperature: this.s.settings.options[PROVIDERS.OLLAMA].temperature,
        });
      case PROVIDERS.ANTHROPIC:
        if (!this.s.settings.options[PROVIDERS.ANTHROPIC].apiKey) {
          throw new Error('No API key');
        }
        const { ChatAnthropic } = await import('@langchain/anthropic');
        this.cache[PROVIDERS.ANTHROPIC] = ChatAnthropic;
        return new ChatAnthropic({
          apiKey: this.s.settings.options[PROVIDERS.ANTHROPIC].apiKey,
          model: model,
          temperature: this.s.settings.options[PROVIDERS.ANTHROPIC].temperature,
        });
      case PROVIDERS.MISTRAL:
        if (!this.s.settings.options[PROVIDERS.MISTRAL].apiKey) {
          throw new Error('No API key');
        }
        const { ChatMistralAI } = await import('@langchain/mistralai');
        this.cache[PROVIDERS.MISTRAL] = ChatMistralAI;
        return new ChatMistralAI({
          apiKey: this.s.settings.options[PROVIDERS.MISTRAL].apiKey,
          model: model,
          temperature: this.s.settings.options[PROVIDERS.MISTRAL].temperature,
        });
      case PROVIDERS.COHERE:
        if (!this.s.settings.options[PROVIDERS.COHERE].apiKey) {
          throw new Error('No API key');
        }
        const { ChatCohere } = await import('@langchain/cohere');
        this.cache[PROVIDERS.COHERE] = ChatCohere;
        return new ChatCohere({
          apiKey: this.s.settings.options[PROVIDERS.COHERE].apiKey,
          model: model,
          temperature: this.s.settings.options[PROVIDERS.COHERE].temperature,
        });
    }
    throw new Error('Unsupported provider');
  }

  // invoke sends a prompt to the chatbot and returns the response
  invoke(prompt: string): Promise<string> {
    if (!this.llm) {
      throw new Error('LLM not initialized');
    }
    return this.llm.invoke(prompt);
  }

  // stream sends a prompt to the chatbot and returns a stream of responses
  stream(prompt: string) {
    if (!this.llm) {
      throw new Error('LLM not initialized');
    }
    return this.llm.stream(prompt);
  }

  // streamWithTemplate sends a prompt to the chatbot with a template and returns a stream of responses
  streamWithSystemPrompt(system: string, prompt: string) {
    let tpl = PromptTemplate.fromTemplate(`System prompt: ${system}\n\n${prompt}\n\nResponse:`);
    let chain = tpl.pipe(this.llm);
    return chain.stream({ system: system, prompt: prompt });
  }
}
