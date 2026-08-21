import { Injectable } from '@angular/core';
import { PromptTemplate } from "@langchain/core/prompts";
import { Runnable } from '@langchain/core/runnables';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { Provider, SettingsService } from './settings.service';
import { ERROR_MESSAGES } from '../core/constants';
import { FileAttachment } from '../core/types';

type MessageContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; mimeType: string; data: string }
  | { type: 'file'; mimeType: string; data: string; metadata: { filename: string } };

type LLMConstructor = new (...args: any[]) => Runnable;

interface ProviderConfig {
  importFn: () => Promise<Record<string, any>>;
  className: string;
  requiresApiKey: boolean;
}

const PROVIDER_REGISTRY: Record<Provider, ProviderConfig> = {
  [Provider.OLLAMA]: {
    importFn: () => import('@langchain/ollama'),
    className: 'ChatOllama',
    requiresApiKey: false,
  },
  [Provider.OPENAI]: {
    importFn: () => import('@langchain/openai'),
    className: 'ChatOpenAI',
    requiresApiKey: true,
  },
  [Provider.ANTHROPIC]: {
    importFn: () => import('@langchain/anthropic'),
    className: 'ChatAnthropic',
    requiresApiKey: true,
  },
  [Provider.MISTRAL]: {
    importFn: () => import('@langchain/mistralai'),
    className: 'ChatMistralAI',
    requiresApiKey: true,
  },
  [Provider.COHERE]: {
    importFn: () => import('@langchain/cohere'),
    className: 'ChatCohere',
    requiresApiKey: true,
  },
  [Provider.GOOGLE]: {
    importFn: () => import('@langchain/google-genai'),
    className: 'ChatGoogleGenerativeAI',
    requiresApiKey: true,
  },
  [Provider.XAI]: {
    importFn: () => import('@langchain/xai'),
    className: 'ChatXAI',
    requiresApiKey: true,
  },
};

@Injectable({
  providedIn: 'root'
})
export class LcService {

  private cache: Map<Provider, LLMConstructor> = new Map();
  private abortController: AbortController | null = null;

  public llm: Runnable | null = null;

  constructor(public s: SettingsService) {
    this.s.setDefaultSettings();
  }

  beginRun(): AbortSignal {
    this.abort();
    this.abortController = new AbortController();
    return this.abortController.signal;
  }

  abort(): void {
    this.abortController?.abort();
    this.abortController = null;
  }

  endRun(): void {
    this.abortController = null;
  }

  isRunning(): boolean {
    return this.abortController !== null;
  }

  async createLLM(provider: string, model: string = '') {
    const p = provider as Provider;
    const config = PROVIDER_REGISTRY[p];
    if (!config) {
      throw new Error('Unsupported provider');
    }

    const options = this.s.settings().options[p];
    if (!model) {
      model = options.model;
    }

    if (config.requiresApiKey && !options.apiKey) {
      throw new Error(ERROR_MESSAGES.NO_API_KEY);
    }

    let Constructor = this.cache.get(p);
    if (!Constructor) {
      const module = await config.importFn();
      Constructor = (module as Record<string, any>)[config.className] as LLMConstructor;
      this.cache.set(p, Constructor);
    }

    return new Constructor({
      apiKey: options.apiKey,
      model,
      temperature: options.temperature,
      baseUrl: options.apiUrl,
    });
  }

  // invoke sends a prompt to the chatbot and returns the response
  invoke(prompt: string, signal?: AbortSignal): Promise<unknown> {
    if (!this.llm) {
      throw new Error('LLM not initialized');
    }
    return this.llm.invoke(prompt, signal ? { signal } : undefined);
  }

  // stream sends a prompt to the chatbot and returns a stream of responses
  stream(prompt: string, signal?: AbortSignal) {
    if (!this.llm) {
      throw new Error('LLM not initialized');
    }
    return this.llm.stream(prompt, signal ? { signal } : undefined);
  }

  // streamWithTemplate sends a prompt to the chatbot with a template and returns a stream of responses
  streamWithSystemPrompt(system: string, prompt: string, signal?: AbortSignal) {
    if (!this.llm) {
      throw new Error('LLM not initialized');
    }
    let tpl = PromptTemplate.fromTemplate(`System prompt: ${system}\n\n${prompt}\n\nResponse:`);
    let chain = tpl.pipe(this.llm);
    return chain.stream({ system: system, prompt: prompt }, signal ? { signal } : undefined);
  }

  // buildMessages converts our message format to LangChain message objects
  // Supports multimodal content (images and PDFs) in human messages
  buildMessages(
    messages: Array<{ role: 'human' | 'ai'; text: string; attachments?: FileAttachment[] }>,
    systemPrompt?: string
  ): (HumanMessage | AIMessage | SystemMessage)[] {
    const langchainMessages: (HumanMessage | AIMessage | SystemMessage)[] = [];

    if (systemPrompt) {
      langchainMessages.push(new SystemMessage(systemPrompt));
    }

    for (const msg of messages) {
      if (msg.role === 'ai') {
        langchainMessages.push(new AIMessage(msg.text));
        continue;
      }

      if (!msg.attachments?.length) {
        langchainMessages.push(new HumanMessage(msg.text));
        continue;
      }

      const content: MessageContentPart[] = [];

      if (msg.text) {
        content.push({ type: 'text', text: msg.text });
      }

      for (const att of msg.attachments) {
        if (att.type === 'image') {
          content.push({
            type: 'image',
            mimeType: att.mimeType,
            data: att.data
          });
        } else {
          content.push({
            type: 'file',
            mimeType: att.mimeType,
            data: att.data,
            metadata: { filename: att.name }
          });
        }
      }

      langchainMessages.push(new HumanMessage({ content }));
    }

    return langchainMessages;
  }

  // streamWithMessages streams a conversation with proper LangChain message objects
  streamWithMessages(
    messages: Array<{ role: 'human' | 'ai'; text: string; attachments?: FileAttachment[] }>,
    systemPrompt?: string,
    signal?: AbortSignal
  ) {
    if (!this.llm) {
      throw new Error('LLM not initialized');
    }

    return this.llm.stream(
      this.buildMessages(messages, systemPrompt),
      signal ? { signal } : undefined
    );
  }
}
