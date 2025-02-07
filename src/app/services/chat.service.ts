import { Injectable } from '@angular/core';
import { LcService } from './lc.service';
import { PromptTemplate } from "@langchain/core/prompts";
import { Runnable } from '@langchain/core/runnables';
import { Subject } from 'rxjs';

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

type Message = {
  text: string;
  isUser: boolean;
  date: Date;
};

@Injectable({
  providedIn: 'root'
})
export class ChatService {


  public history: Chat = {} as Chat;
  public enterSubmit: boolean = false;
  public arena = {} as Arena;
  public arenaStarted = false;
  public streamStarted = new Subject<void>();

  constructor(
    public lc: LcService,
  ) {
    this.lc.s.loadSettings();
    this.enterSubmit = this.lc.s.settings().enterSubmit;
  }


  async newChat() {
    this.history = {} as Chat;
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
    this.arenaStarted = false;
    this.arena.p1 = {} as Player;
    this.arena.p2 = {} as Player;
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

    return chain.invoke({ prompt: prompt });
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
  async chat(prompt: string) {
    if (this.history.messages === undefined) {
      this.history.name = "";
      this.history.messages = [];
    }

    // Prepare chat history for the chatbot before adding the prompt
    const chatHistory = this.prepareChatHistory(this.history.messages);

    // Add user message to chat
    this.history.messages.push({
      text: prompt,
      isUser: true,
      date: new Date()
    });

    // If this is the first message, create a chat name
    if (this.history.messages.length === 1) {
      let answer = await this.createChatName(prompt, this.lc.llm);
      // Remove any content between <> brackets
      this.history.name = answer?.content.replace(/<[^>]*>/g, "");
    }

    let chain = this.createChatChain(this.lc.llm);

    // Add bot message to chat history
    let messageNumber = this.history.messages.length;
    let stream = await chain.stream({ user_prompt: prompt, chat_history: chatHistory })
    let firstChunk = true;
    for await (let chunk of stream) {
      if (firstChunk) {
        this.streamStarted.next();
        firstChunk = false;
      }
      if (this.history.messages.length > messageNumber) {
        this.history.messages[messageNumber].text += chunk?.content;
      } else {
        // replace "\n\n" with "<br>"
        this.history.messages.push({
          text: chunk?.content,
          isUser: false,
          date: new Date()
        });
      }
    }

    this.saveChat();
  }

  async chatArena(prompt: string) {
    if (this.arena.p1.messages === undefined) {
      this.arena.p1.messages = [];
    }

    if (this.arena.p2.messages === undefined) {
      this.arena.p2.messages = [];
    }

    // Prepare chat history for the chatbot before adding the prompt
    const chatHistory1 = this.prepareChatHistory(this.arena.p1.messages);
    const chatHistory2 = this.prepareChatHistory(this.arena.p2.messages);

    // Add user message to chat
    this.arena.p1.messages.push({
      text: prompt,
      isUser: true,
      date: new Date()
    });

    this.arena.p2.messages.push({
      text: prompt,
      isUser: true,
      date: new Date()
    });

    // If this is the first message, create a chat name
    if (this.arena.p1.messages.length === 1) {
      let answer = await this.createChatName(prompt, this.arena.p1.llm || this.arena.p2.llm || this.lc.llm);
      this.arena.name = answer?.content
    }

    let chain1 = this.createChatChain(this.arena.p1.llm);
    let chain2 = this.createChatChain(this.arena.p2.llm);

    // Add bot message to chat history
    let messageNumber1 = this.arena.p1.messages.length;
    let promise1 = chain1.stream({ user_prompt: prompt, chat_history: chatHistory1 }).then(async (stream1) => {
      for await (let chunk of stream1) {
        if (this.arena.p1.messages.length > messageNumber1) {
          this.arena.p1.messages[messageNumber1].text += chunk?.content;
        } else {
          // replace "\n\n" with "<br>"
          this.arena.p1.messages.push({
            text: chunk?.content,
            isUser: false,
            date: new Date()
          });
        }
      }
    });

    let messageNumber2 = this.arena.p2.messages.length;
    let promise2 = chain2.stream({ user_prompt: prompt, chat_history: chatHistory2 }).then(async (stream2) => {
      for await (let chunk of stream2) {
        if (this.arena.p2.messages.length > messageNumber2) {
          this.arena.p2.messages[messageNumber2].text += chunk?.content;
        } else {
          // replace "\n\n" with "<br>"
          this.arena.p2.messages.push({
            text: chunk?.content,
            isUser: false,
            date: new Date()
          });
        }
      }
    });

    await Promise.all([promise1, promise2]);
    this.saveArena();
  }


  // saveChat saves chat to local storage, with the key "chat_" + chatName
  saveChat() {
    if (this.history.name === "") {
      return;
    }

    if (this.lc.s.currentChatKey === "") {
      this.lc.s.currentChatKey = "chat_" + Date.now().toString();
    }

    localStorage.setItem(this.lc.s.currentChatKey, JSON.stringify(this.history));

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
      this.lc.s.currentArenaKey = "arena_" + Date.now().toString();
    }

    localStorage.setItem(this.lc.s.currentArenaKey, JSON.stringify(this.arena));

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
    let chat = localStorage.getItem(key);
    if (chat) {
      this.lc.s.currentChatKey = key;
      this.history = JSON.parse(chat) as Chat;
    }
  }

  // loadArena loads the arena chat from local storage
  loadArena(key: string) {
    let arena = localStorage.getItem(key);
    if (arena) {
      this.lc.s.currentArenaKey = key;
      this.arena = JSON.parse(arena) as Arena;
    }
  }

  // prepareChatHistory prepares the chat history for the chatbot
  prepareChatHistory(messages: Message[]): string {
    let chatHistory = "";
    for (let message of messages) {
      if (message.isUser) {
        chatHistory += "Human: " + message.text + "\n\n";
      } else {
        chatHistory += "AI: " + message.text + "\n\n";
      }
    }
    if (chatHistory === "") {
      return "No chat history";
    }
    return chatHistory;
  }

  loadDiscussion(key: string) {
    const saved = localStorage.getItem(key);
    if (saved) {
      return JSON.parse(saved);
    }
    return null;
  }

  getSavedDiscussions() {
    const keys = Object.keys(localStorage).filter(key => key.startsWith('discussion_'));
    return keys.map(key => ({
      key,
      name: JSON.parse(localStorage.getItem(key) || '{}').title || 'Untitled Discussion'
    }));
  }

  deleteDiscussion(key: string) {
    localStorage.removeItem(key);
  }

}
