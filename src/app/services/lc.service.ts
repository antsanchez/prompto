import { Injectable } from '@angular/core';
import { PromptTemplate } from "@langchain/core/prompts";
import { Runnable } from '@langchain/core/runnables';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { Provider, SettingsService } from './settings.service';
import { ERROR_MESSAGES } from '../core/constants';
import { FileAttachment } from '../core/types';

type LLMConstructor = new (...args: any[]) => Runnable;

@Injectable({
  providedIn: 'root'
})
export class LcService {

  // Settings are saved into the local storage
  private cache: Map<Provider, LLMConstructor> = new Map();

  public llm: Runnable | null = null;

  constructor(public s: SettingsService) {
    this.s.setDefaultSettings();
  }

  // createLLM creates the LLM based on the provider
  async createLLM(provider: string, model: string = '') {
    if (model === '' || !model) {
      model = this.s.settings().options[provider as Provider].model;
    }

    // Check if the class is already cached
    const cachedClass = this.cache.get(provider as Provider);
    if (cachedClass) {
      return new cachedClass({
        apiKey: this.s.settings().options[provider as Provider].apiKey,
        model: model,
        temperature: this.s.settings().options[provider as Provider].temperature,
        baseUrl: this.s.settings().options[provider as Provider].apiUrl,
      });
    }

    switch (provider) {
      case Provider.OPENAI:
        if (!this.s.settings().options[Provider.OPENAI].apiKey) {
          throw new Error(ERROR_MESSAGES.NO_API_KEY);
        }
        const { ChatOpenAI } = await import('@langchain/openai');
        this.cache.set(Provider.OPENAI, ChatOpenAI);
        return new ChatOpenAI({
          apiKey: this.s.settings().options[Provider.OPENAI].apiKey,
          model: model,
          temperature: this.s.settings().options[Provider.OPENAI].temperature,
        });
      case Provider.OLLAMA:
        const { ChatOllama } = await import('@langchain/ollama');
        this.cache.set(Provider.OLLAMA, ChatOllama);
        return new ChatOllama({
          baseUrl: this.s.settings().options[Provider.OLLAMA].apiUrl,
          model: model,
          temperature: this.s.settings().options[Provider.OLLAMA].temperature,
        });
      case Provider.ANTHROPIC:
        if (!this.s.settings().options[Provider.ANTHROPIC].apiKey) {
          throw new Error(ERROR_MESSAGES.NO_API_KEY);
        }
        const { ChatAnthropic } = await import('@langchain/anthropic');
        this.cache.set(Provider.ANTHROPIC, ChatAnthropic);
        return new ChatAnthropic({
          apiKey: this.s.settings().options[Provider.ANTHROPIC].apiKey,
          model: model,
          temperature: this.s.settings().options[Provider.ANTHROPIC].temperature,
        });
      case Provider.MISTRAL:
        if (!this.s.settings().options[Provider.MISTRAL].apiKey) {
          throw new Error(ERROR_MESSAGES.NO_API_KEY);
        }
        const { ChatMistralAI } = await import('@langchain/mistralai');
        this.cache.set(Provider.MISTRAL, ChatMistralAI);
        return new ChatMistralAI({
          apiKey: this.s.settings().options[Provider.MISTRAL].apiKey,
          model: model,
          temperature: this.s.settings().options[Provider.MISTRAL].temperature,
        });
      case Provider.COHERE:
        if (!this.s.settings().options[Provider.COHERE].apiKey) {
          throw new Error(ERROR_MESSAGES.NO_API_KEY);
        }
        const { ChatCohere } = await import('@langchain/cohere');
        this.cache.set(Provider.COHERE, ChatCohere);
        return new ChatCohere({
          apiKey: this.s.settings().options[Provider.COHERE].apiKey,
          model: model,
          temperature: this.s.settings().options[Provider.COHERE].temperature,
        });
      case Provider.GOOGLE:
        if (!this.s.settings().options[Provider.GOOGLE].apiKey) {
          throw new Error(ERROR_MESSAGES.NO_API_KEY);
        }
        const { ChatGoogleGenerativeAI } = await import('@langchain/google-genai');
        this.cache.set(Provider.GOOGLE, ChatGoogleGenerativeAI);
        return new ChatGoogleGenerativeAI({
          apiKey: this.s.settings().options[Provider.GOOGLE].apiKey,
          model: model,
          temperature: this.s.settings().options[Provider.GOOGLE].temperature,
        });
      case Provider.XAI:
        if (!this.s.settings().options[Provider.XAI].apiKey) {
          throw new Error(ERROR_MESSAGES.NO_API_KEY);
        }
        const { ChatXAI } = await import('@langchain/xai');
        this.cache.set(Provider.XAI, ChatXAI);
        return new ChatXAI({
          apiKey: this.s.settings().options[Provider.XAI].apiKey,
          model: model,
          temperature: this.s.settings().options[Provider.XAI].temperature,
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
    if (!this.llm) {
      throw new Error('LLM not initialized');
    }
    let tpl = PromptTemplate.fromTemplate(`System prompt: ${system}\n\n${prompt}\n\nResponse:`);
    let chain = tpl.pipe(this.llm);
    return chain.stream({ system: system, prompt: prompt });
  }

  // streamWithMessages streams a conversation with proper LangChain message objects
  // Supports multimodal content (images and PDFs) in human messages
  streamWithMessages(
    messages: Array<{ role: 'human' | 'ai'; text: string; attachments?: FileAttachment[] }>,
    systemPrompt?: string
  ) {
    if (!this.llm) {
      throw new Error('LLM not initialized');
    }

    const langchainMessages: (HumanMessage | AIMessage | SystemMessage)[] = [];

    // Add system message if provided
    if (systemPrompt) {
      langchainMessages.push(new SystemMessage(systemPrompt));
    }

    // Convert messages to LangChain message objects
    for (const msg of messages) {
      if (msg.role === 'ai') {
        langchainMessages.push(new AIMessage(msg.text));
        continue;
      }

      // Human message - may have attachments
      if (!msg.attachments?.length) {
        langchainMessages.push(new HumanMessage(msg.text));
        continue;
      }

      // Build multimodal content array
      const content: any[] = [];

      // Add text content first if present
      if (msg.text) {
        content.push({ type: 'text', text: msg.text });
      }

      // Add attachments
      for (const att of msg.attachments) {
        if (att.type === 'image') {
          content.push({
            type: 'image_url',
            image_url: { url: `data:${att.mimeType};base64,${att.data}` }
          });
        } else if (att.type === 'pdf') {
          // PDF handling varies by provider, use document type for Anthropic
          // or convert to text description for others
          content.push({
            type: 'image_url',
            image_url: {
              url: `data:${att.mimeType};base64,${att.data}`
            }
          });
        }
      }

      langchainMessages.push(new HumanMessage({ content }));
    }

    return this.llm.stream(langchainMessages);
  }
}
