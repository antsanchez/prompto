import { Injectable } from '@angular/core';
import { LcService } from './lc.service';
import { PromptTemplate } from "@langchain/core/prompts";

export type Chat = {
  name: string;
  messages: Message[];
};

export type Message = {
  text: string;
  isUser: boolean;
  date: Date;
};

export type ChatKeys = {
  key: string;
  name: string;
};

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  public currentKey: string = "";
  public history: Chat = {} as Chat;
  public chats: ChatKeys[] = [] as ChatKeys[];

  constructor(private lc: LcService) { }

  new() {
    this.history = {} as Chat;
    this.currentKey = "";
  }

  // createChatName creates a chat name based on the first user prompt
  async createChatName(prompt: string) {
    let fullPrompt = PromptTemplate.fromTemplate(
      `Try to guess the theme of this chat conversation based on the first user prompt and give it a brief, 
      descriptive name using only letters, no longer than 50-60 characters (shorter is better). 
      If you're unsure, repeat the user prompt. 
      Here is the user prompt: ${prompt}`
    );

    let chain = fullPrompt.pipe(this.lc.llm);

    return chain.invoke({ prompt: prompt });
  }

  // chat sends a prompt to the chatbot and adds the response to the chat history
  async chat(prompt: string) {
    if (this.history.messages === undefined) {
      this.history.name = "";
      this.history.messages = [];
    }

    // Prepare chat history without including the current message
    let chatStory = this.prepareChatHistory();

    // Add user message to chat
    this.history.messages.push({
      text: prompt,
      isUser: true,
      date: new Date()
    });

    // If this is the first message, create a chat name
    if (this.history.messages.length === 1) {
      this.history.name = await this.createChatName(prompt);
    }

    const promptTemplate = PromptTemplate.fromTemplate(
      `You are a nice chatbot having a conversation with a human.

      Previous conversation:
      {chat_history}

      New human question: {user_prompt}
      Response:`
    );

    let chain = promptTemplate.pipe(this.lc.llm);

    // Add bot message to chat history
    let messageNumber = this.history.messages.length;
    let stream = await chain.stream({ user_prompt: prompt, chat_history: chatStory })
    for await (let chunk of stream) {
      if (this.history.messages.length > messageNumber) {
        this.history.messages[messageNumber].text += chunk;
      } else {
        // replace "\n\n" with "<br>"
        this.history.messages.push({
          text: chunk,
          isUser: false,
          date: new Date()
        });
      }
    }


    this.saveChat();
  }


  // saveChat saves chat to local storage, with the key "chat_" + chatName
  saveChat() {
    if (this.history.name === "") {
      return;
    }

    if (this.currentKey === "") {
      this.currentKey = "chat_" + Date.now().toString();
    }

    localStorage.setItem(this.currentKey, JSON.stringify(this.history));

    // if the chat is not already in the list of chats, add it
    if (!this.chats.find((chat) => chat.key === this.currentKey)) {
      this.chats.push({
        key: this.currentKey,
        name: this.history.name
      });
    }
  }

  // loadChat loads chat from local storage
  loadChat(key: string) {
    let chat = localStorage.getItem(key);
    if (chat) {
      this.currentKey = key;
      this.history = JSON.parse(chat);
    }
  }

  // load all chat names from local storage
  loadChatNames() {
    this.chats = [] as ChatKeys[];
    for (let i = 0; i < localStorage.length; i++) {
      let key = localStorage.key(i);
      if (key && key.startsWith("chat_")) {
        console.log("key", key)
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
  }

  // delete chat from local storage
  deleteChat(key: string) {
    localStorage.removeItem(key);
    this.chats = this.chats.filter((chat) => chat.key !== key);
    this.history = {} as Chat;
    this.currentKey = "";
  }

  // prepareChatHistory prepares the chat history for the chatbot
  prepareChatHistory(): string {
    let chatHistory = "";
    for (let message of this.history.messages) {
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
}
