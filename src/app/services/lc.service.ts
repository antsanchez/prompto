import { Injectable } from '@angular/core';
import { PromptTemplate } from "@langchain/core/prompts";
import { Runnable } from '@langchain/core/runnables';
import { Provider, SettingsService } from './settings.service';


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
  async createLLM(provider: string, model: string = '') {
    if (model === '' || !model) {
      model = this.s.settings().options[provider as Provider].model;
    }

    // Check if the class is already cached
    if (this.cache[provider]) {
      return new this.cache[provider]({
        apiKey: this.s.settings().options[provider as Provider].apiKey,
        model: model,
        temperature: this.s.settings().options[provider as Provider].temperature,
        baseUrl: this.s.settings().options[provider as Provider].apiUrl,
      });
    }

    switch (provider) {
      case Provider.OPENAI:
        if (!this.s.settings().options[Provider.OPENAI].apiKey) {
          throw new Error('No API key');
        }
        const { ChatOpenAI } = await import('@langchain/openai');
        this.cache[Provider.OPENAI] = ChatOpenAI;
        return new ChatOpenAI({
          apiKey: this.s.settings().options[Provider.OPENAI].apiKey,
          model: model,
          temperature: this.s.settings().options[Provider.OPENAI].temperature,
        });
      case Provider.OLLAMA:
        const { ChatOllama } = await import('@langchain/ollama');
        this.cache[Provider.OLLAMA] = ChatOllama;
        return new ChatOllama({
          baseUrl: this.s.settings().options[Provider.OLLAMA].apiUrl,
          model: model,
          temperature: this.s.settings().options[Provider.OLLAMA].temperature,
        });
      case Provider.ANTHROPIC:
        if (!this.s.settings().options[Provider.ANTHROPIC].apiKey) {
          throw new Error('No API key');
        }
        const { ChatAnthropic } = await import('@langchain/anthropic');
        this.cache[Provider.ANTHROPIC] = ChatAnthropic;
        return new ChatAnthropic({
          apiKey: this.s.settings().options[Provider.ANTHROPIC].apiKey,
          model: model,
          temperature: this.s.settings().options[Provider.ANTHROPIC].temperature,
        });
      case Provider.MISTRAL:
        if (!this.s.settings().options[Provider.MISTRAL].apiKey) {
          throw new Error('No API key');
        }
        const { ChatMistralAI } = await import('@langchain/mistralai');
        this.cache[Provider.MISTRAL] = ChatMistralAI;
        return new ChatMistralAI({
          apiKey: this.s.settings().options[Provider.MISTRAL].apiKey,
          model: model,
          temperature: this.s.settings().options[Provider.MISTRAL].temperature,
        });
      case Provider.COHERE:
        if (!this.s.settings().options[Provider.COHERE].apiKey) {
          throw new Error('No API key');
        }
        const { ChatCohere } = await import('@langchain/cohere');
        this.cache[Provider.COHERE] = ChatCohere;
        return new ChatCohere({
          apiKey: this.s.settings().options[Provider.COHERE].apiKey,
          model: model,
          temperature: this.s.settings().options[Provider.COHERE].temperature,
        });
      case Provider.GOOGLE:
        if (!this.s.settings().options[Provider.GOOGLE].apiKey) {
          throw new Error('No API key');
        }
        const { ChatGoogleGenerativeAI } = await import('@langchain/google-genai');
        this.cache[Provider.GOOGLE] = ChatGoogleGenerativeAI;
        return new ChatGoogleGenerativeAI({
          apiKey: this.s.settings().options[Provider.GOOGLE].apiKey,
          model: model,
          temperature: this.s.settings().options[Provider.GOOGLE].temperature,
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
