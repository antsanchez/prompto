import { Injectable } from '@angular/core';
import { LcService } from './lc.service';
import { PromptTemplate } from "@langchain/core/prompts";
import { Runnable } from '@langchain/core/runnables';
import { Subject } from 'rxjs';
import { DEFAULTS, STORAGE_KEYS } from '../core/constants';
import { StorageService } from './storage.service';
import { FileAttachment, Message } from '../core/types';
import { FileService } from './file.service';
import { extractChunkParts, isAbortError } from '../core/llm-content';

type Arena = {
  name: string;
  p1: Player;
  p2: Player;
}

type Player = {
  provider: string;
  model: string;
  llm: Runnable;
  messages: Message[];
}

type Chat = {
  name: string;
  messages: Message[];
};

function createEmptyChat(): Chat {
  return {
    name: '',
    messages: []
  };
}

function createEmptyPlayer(): Player {
  return {
    provider: '',
    model: '',
    llm: null as unknown as Runnable,
    messages: []
  };
}

function createEmptyArena(): Arena {
  return {
    name: '',
    p1: createEmptyPlayer(),
    p2: createEmptyPlayer()
  };
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  public history: Chat = createEmptyChat();
  public enterSubmit: boolean = false;
  public arena: Arena = createEmptyArena();
  public arenaStarted = false;
  public streamStarted = new Subject<void>();

  constructor(
    public lc: LcService,
    private storage: StorageService,
    private fileService: FileService
  ) {
    this.lc.s.loadSettings();
    this.enterSubmit = this.lc.s.settings().enterSubmit;
  }


  stop() {
    this.lc.abort();
  }

  async newChat() {
    this.lc.abort();
    this.history = createEmptyChat();
    this.lc.s.currentChatKey = "";
    this.lc.s.currentArenaKey = "";

    try {
      this.lc.llm = await this.lc.createLLM(this.lc.s.getProvider());
      this.lc.s.setConnected(true);
    } catch (error) {
      this.lc.s.setConnected(false);
      console.error('Error creating new chat:', error);
    }
  }

  arenaShouldBeStarted() {
    return this.arena.p1?.provider && this.arena.p1?.model && this.arena.p2?.provider && this.arena.p2?.model;
  }

  async startArena() {
    // Check if the provider and models are set
    if (!this.arena.p1?.provider || !this.arena.p1?.model || !this.arena.p2?.provider || !this.arena.p2?.model) {
      return;
    }

    this.lc.s.currentArenaKey = "";

    try {
      // Load settings
      this.lc.s.loadSettings();

      // Create LLMs for both players
      const [llm1, llm2] = await Promise.all([
        this.lc.createLLM(this.arena.p1.provider, this.arena.p1.model),
        this.lc.createLLM(this.arena.p2.provider, this.arena.p2.model)
      ]);

      // Assign LLMs to the arena players
      this.arena.p1.llm = llm1;
      this.arena.p2.llm = llm2;

      // Mark arena as started
      this.arenaStarted = true;
    } catch (error) {
      this.arenaStarted = false;
      console.error('Error creating new arena:', error);
      throw error;
    }
  }

  newArena() {
    this.lc.abort();
    this.arenaStarted = false;
    this.arena.p1 = createEmptyPlayer();
    this.arena.p2 = createEmptyPlayer();
  }

  isConnected() {
    return this.lc.s.isConnected();
  }

  setConnected(connected: boolean) {
    this.lc.s.setConnected(connected);
  }

  checkConnection() {
    this.lc.s.checkConnection();
  }

  changeEnterSubmit() {
    this.enterSubmit = !this.enterSubmit;
    this.lc.s.setEnterSubmit(this.enterSubmit);
  }

  // createChatName creates a chat name based on the first user prompt
  async createChatName(prompt: string, llm: Runnable) {
    let fullPrompt = PromptTemplate.fromTemplate(
      `Try to guess the theme of this chat conversation based on the first user prompt and give it a brief,
      descriptive name using only letters, no longer than 50-60 characters (shorter is better).
      If you're unsure, repeat the user prompt. Answer only with the name of the chat theme. Keep it simple and clear, no more than a few words.
      Here is the user prompt: ${prompt}`
    );

    let chain = fullPrompt.pipe(llm);

    return chain.invoke({ prompt: prompt }).then(answer => extractChunkParts(answer).text);
  }

  // createChatChain creates a chat chain based on the user prompt and the given LLM
  createChatChain(llm: Runnable): Runnable {
    return PromptTemplate.fromTemplate(
      `You are a nice chatbot having a conversation with a human.

      Previous conversation:
      {chat_history}

      New human question: {user_prompt}
      Response:`
    ).pipe(llm);
  }

  // chat sends a prompt to the chatbot and adds the response to the chat history
  async chat(prompt: string, attachments?: FileAttachment[]) {
    if (this.history.messages === undefined) {
      this.history.name = "";
      this.history.messages = [];
    }

    // Build text that includes attachment placeholders for storage
    let displayText = prompt;
    if (attachments?.length) {
      const placeholders = attachments.map(att => this.fileService.getAttachmentPlaceholder(att));
      displayText = prompt + (prompt ? '\n' : '') + placeholders.join('\n');
    }

    // Add user message to chat (attachments are ephemeral, only placeholder text is stored)
    this.history.messages.push({
      text: displayText,
      isUser: true,
      date: new Date()
    });

    if (!this.lc.llm) {
      throw new Error('LLM not initialized');
    }

    if (this.history.messages.length === 1) {
      this.history.name = this.history.name || DEFAULTS.UNTITLED_CHAT;
      this.saveChat();
      void this.nameChat(prompt, this.lc.llm);
    }

    const signal = this.lc.beginRun();
    const langchainMessages = this.prepareMessages(this.history.messages, prompt, attachments);
    const stream = await this.lc.streamWithMessages(
      langchainMessages,
      'You are a nice chatbot having a conversation with a human.',
      signal
    );

    const botMessage: Message = {
      text: '',
      isUser: false,
      date: new Date()
    };
    this.history.messages.push(botMessage);

    try {
      let firstChunk = true;
      for await (const chunk of stream) {
        if (signal.aborted) {
          break;
        }
        if (firstChunk) {
          this.streamStarted.next();
          firstChunk = false;
        }
        const parts = extractChunkParts(chunk);
        botMessage.text += parts.text;
        if (parts.thinking) {
          botMessage.thinking = (botMessage.thinking || '') + parts.thinking;
        }
      }
    } catch (error) {
      if (!isAbortError(error)) {
        throw error;
      }
    } finally {
      this.lc.endRun();
      this.saveChat();
    }
  }

  private async nameChat(prompt: string, llm: Runnable) {
    try {
      const name = (await this.createChatName(prompt, llm)).replace(/<[^>]*>/g, '').trim();
      if (!name) {
        return;
      }
      this.history.name = name;
      const listed = this.lc.s.chats.find(chat => chat.key === this.lc.s.currentChatKey);
      if (listed) {
        listed.name = name;
      }
      this.saveChat();
    } catch (error) {
      console.error('Error creating chat name:', error);
    }
  }

  // prepareMessages converts chat history to LangChain message format
  // The current message with attachments is passed separately to include multimodal content
  private prepareMessages(
    messages: Message[],
    currentPrompt: string,
    currentAttachments?: FileAttachment[]
  ): Array<{ role: 'human' | 'ai'; text: string; attachments?: FileAttachment[] }> {
    const result: Array<{ role: 'human' | 'ai'; text: string; attachments?: FileAttachment[] }> = [];

    // Add all previous messages (excluding the last user message which we just added)
    for (let i = 0; i < messages.length - 1; i++) {
      const msg = messages[i];
      result.push({
        role: msg.isUser ? 'human' : 'ai',
        text: msg.text
      });
    }

    // Add the current message with attachments
    result.push({
      role: 'human',
      text: currentPrompt,
      attachments: currentAttachments
    });

    return result;
  }

  async chatArena(prompt: string, attachments?: FileAttachment[]) {
    if (this.arena.p1.messages === undefined) {
      this.arena.p1.messages = [];
    }

    if (this.arena.p2.messages === undefined) {
      this.arena.p2.messages = [];
    }

    // Build text that includes attachment placeholders for storage
    let displayText = prompt;
    if (attachments?.length) {
      const placeholders = attachments.map(att => this.fileService.getAttachmentPlaceholder(att));
      displayText = prompt + (prompt ? '\n' : '') + placeholders.join('\n');
    }

    // Add user message to chat
    this.arena.p1.messages.push({
      text: displayText,
      isUser: true,
      date: new Date()
    });

    this.arena.p2.messages.push({
      text: displayText,
      isUser: true,
      date: new Date()
    });

    if (this.arena.p1.messages.length === 1) {
      this.arena.name = this.arena.name || DEFAULTS.UNTITLED_ARENA;
      this.saveArena();
      const llmForName = this.arena.p1.llm || this.arena.p2.llm || this.lc.llm;
      if (llmForName) {
        void this.nameArena(prompt, llmForName);
      }
    }

    const messages1 = this.prepareMessages(this.arena.p1.messages, prompt, attachments);
    const messages2 = this.prepareMessages(this.arena.p2.messages, prompt, attachments);
    const systemPrompt = 'You are a nice chatbot having a conversation with a human.';
    const signal = this.lc.beginRun();

    const streamPlayer = async (player: Player, msgs: typeof messages1) => {
      const langchainMessages = this.lc.buildMessages(msgs, systemPrompt);
      const botMessage: Message = {
        text: '',
        isUser: false,
        date: new Date()
      };
      player.messages.push(botMessage);

      try {
        const stream = await player.llm.stream(langchainMessages, { signal });
        for await (const chunk of stream) {
          if (signal.aborted) {
            break;
          }
          const parts = extractChunkParts(chunk);
          botMessage.text += parts.text;
          if (parts.thinking) {
            botMessage.thinking = (botMessage.thinking || '') + parts.thinking;
          }
        }
      } catch (error) {
        if (!isAbortError(error)) {
          throw error;
        }
      }
    };

    try {
      await Promise.all([
        streamPlayer(this.arena.p1, messages1),
        streamPlayer(this.arena.p2, messages2)
      ]);
    } finally {
      this.lc.endRun();
      this.saveArena();
    }
  }

  private async nameArena(prompt: string, llm: Runnable) {
    try {
      const name = (await this.createChatName(prompt, llm)).replace(/<[^>]*>/g, '').trim();
      if (!name) {
        return;
      }
      this.arena.name = name;
      const listed = this.lc.s.arenas.find(arena => arena.key === this.lc.s.currentArenaKey);
      if (listed) {
        listed.name = name;
      }
      this.saveArena();
    } catch (error) {
      console.error('Error creating arena name:', error);
    }
  }


  // saveChat saves chat to local storage, with the key "chat_" + chatName
  saveChat() {
    if (this.history.name === "") {
      return;
    }

    if (this.lc.s.currentChatKey === "") {
      this.lc.s.currentChatKey = STORAGE_KEYS.CHAT + Date.now().toString();
    }

    this.storage.setItem(this.lc.s.currentChatKey, this.history);

    // if the chat is not already in the list of chats, add it
    if (!this.lc.s.chats.find((chat) => chat.key === this.lc.s.currentChatKey)) {
      this.lc.s.chats.push({
        key: this.lc.s.currentChatKey,
        name: this.history.name
      });
    }
  }

  // saveArena saves the arena chat to local storage
  saveArena() {
    if (this.arena.p1.messages === undefined || this.arena.p2.messages === undefined) {
      return;
    }

    if (this.lc.s.currentArenaKey === "") {
      this.lc.s.currentArenaKey = STORAGE_KEYS.ARENA + Date.now().toString();
    }

    this.storage.setItem(this.lc.s.currentArenaKey, this.arena);

    // if the chat is not already in the list of chats, add it
    if (!this.lc.s.arenas.find((arena) => arena.key === this.lc.s.currentArenaKey)) {
      this.lc.s.arenas.push({
        key: this.lc.s.currentArenaKey,
        name: this.arena.name
      });
    }
  }

  // loadChat loads chat from local storage
  loadChat(key: string) {
    const chat = this.storage.getItem<Chat>(key);
    if (chat) {
      this.lc.s.currentChatKey = key;
      this.history = chat;
    }
  }

  // loadArena loads the arena chat from local storage
  loadArena(key: string) {
    const arena = this.storage.getItem<Arena>(key);
    if (arena) {
      this.lc.s.currentArenaKey = key;
      this.arena = arena;
    }
  }

}
