import { Injectable } from '@angular/core';
import { LcService } from './lc.service';
import { PromptTemplate } from "@langchain/core/prompts";

type Agent = {
  name: string;
  description: string;
  messages: Message[];
}

type Discussion = {
  key?: string;  // Add key property
  title: string;
  context: string;
  agents: Agent[];
  currentAgentIndex: number;
  messages: Message[];
  summary?: string;  // Add summary field
}

type Message = {
  text: string;
  agentIndex: number;
  agentName: string;
  date: Date;
}

@Injectable({
  providedIn: 'root'
})
export class DiscussionService {
  public currentDiscussion: Discussion = {} as Discussion;

  constructor(
    public lc: LcService
  ) {
    this.checkConnection();
  }

  checkConnection() {
    this.lc.s.checkConnection();
  }

  public isConnected(): boolean {
    return this.lc.s.isConnected();
  }

  setConnected(status: boolean) {
    if (this.lc?.s) {
      this.lc.s.setConnected(status);
    }
  }

  // Create a blank discussion
  async newDiscussion() {
    this.currentDiscussion = {
      title: '',
      context: '',
      agents: [],
      currentAgentIndex: 0,
      messages: []
    };
  }

  async createDiscussion(title: string, context: string, agentData: { name: string, description: string }[]) {
    await this.checkConnection();

    this.currentDiscussion = {
      title,
      context,
      agents: agentData.map(agent => ({
        name: agent.name,
        description: agent.description,
        messages: []
      })),
      currentAgentIndex: 0,
      messages: []
    };

    try {
      this.lc.llm = await this.lc.createLLM(this.lc.s.getProvider());
    } catch (error) {
      console.error('Error initializing LLM:', error);
      throw error;
    }

    // Start the discussion with an initial prompt
    return this.startDiscussion();
  }

  private createAgentPrompt(agent: Agent): PromptTemplate {
    // Create a summary of all agents for context
    const agentsSummary = this.currentDiscussion.agents
      .map((a, index) => `${a.name} (Agent ${index + 1}): ${a.description}`)
      .join('\n\n');

    return PromptTemplate.fromTemplate(
      `You are ${agent.name} in an ongoing group discussion. 

      YOUR CORE IDENTITY AND PERSPECTIVE:
      ${agent.description}

      FELLOW PARTICIPANTS:
      ${agentsSummary}

      DISCUSSION TOPIC AND CONTEXT:
      ${this.currentDiscussion.context}

      CONVERSATION SO FAR:
      {chat_history}

      As ${agent.name}, continue this discussion naturally. If this is your first time speaking, briefly acknowledge the ongoing conversation before adding your perspective - no need for formal introductions.
      Focus on responding to previous points and moving the discussion forward while maintaining your unique viewpoint and expertise.
      Keep your response concise and conversational, as if you're speaking in a real-time group discussion.

      Stay in character as ${agent.name}, but speak naturally without continually mentioning your role or characteristics explicitly. React to what others have said and build upon their points while adding your unique insights.
      Feel free to ask questions, share anecdotes, or provide examples to illustrate your points.
      If you have nothing else to add, you can say "I have nothing to add".
      
      ${agent.name}'s next contribution:`
    );
  }

  private prepareChatHistory(): string {
    if (this.currentDiscussion.messages.length === 0) {
      return "No previous messages";
    }

    return this.currentDiscussion.messages.map(message => {
      const agent = this.currentDiscussion.agents[message.agentIndex];
      return `${agent.name}: ${message.text}\n\n`;
    }).join('');
  }

  async startDiscussion() {
    if (this.currentDiscussion.messages.length === 0) {
      return this.getNextAgentResponse();
    }

    return this.currentDiscussion.messages[this.currentDiscussion.messages.length - 1];
  }

  async getNextAgentResponse(): Promise<Message> {
    const currentAgent = this.currentDiscussion.agents[this.currentDiscussion.currentAgentIndex];
    const prompt = this.createAgentPrompt(currentAgent);
    const chain = prompt.pipe(this.lc.llm);

    let response = '';
    const stream = await chain.stream({
      context: this.currentDiscussion.context,
      chat_history: this.prepareChatHistory()
    });

    for await (const chunk of stream) {
      response += chunk?.content || '';
    }

    const message: Message = {
      text: response,
      agentIndex: this.currentDiscussion.currentAgentIndex,
      agentName: currentAgent.name,
      date: new Date()
    };

    // Add message to both the main discussion and the agent's history
    this.currentDiscussion.messages.push(message);
    currentAgent.messages.push(message);

    // Move to next agent
    this.currentDiscussion.currentAgentIndex =
      (this.currentDiscussion.currentAgentIndex + 1) % this.currentDiscussion.agents.length;

    return message;
  }

  async continueDiscussion(rounds: number = 1): Promise<Message[]> {
    await this.checkConnection();
    const messages: Message[] = [];

    for (let i = 0; i < rounds * this.currentDiscussion.agents.length; i++) {
      const message = await this.getNextAgentResponse();
      messages.push(message);
    }

    return messages;
  }

  async summarizeDiscussion(): Promise<string> {
    await this.checkConnection();

    // Ensure LLM is initialized before summarizing
    if (!this.lc.llm) {
      try {
        this.lc.llm = await this.lc.createLLM(this.lc.s.getProvider());
      } catch (error) {
        console.error('Error initializing LLM before summarization:', error);
        throw error;
      }
    }

    const prompt = PromptTemplate.fromTemplate(
      `You are a neutral observer of the following discussion. Summarize the key points and assert a verdict based on the conversation.

      DISCUSSION TOPIC AND CONTEXT:
      ${this.currentDiscussion.context}

      CONVERSATION SO FAR:
      {chat_history}

      Summary and Verdict:`
    );

    const chain = prompt.pipe(this.lc.llm);
    const chatHistory = this.prepareChatHistory();

    let summary = '';
    const stream = await chain.stream({
      context: this.currentDiscussion.context,
      chat_history: chatHistory
    });

    for await (const chunk of stream) {
      summary += chunk?.content || '';
    }

    // Save the summary to the current discussion
    this.currentDiscussion.summary = summary;
    return summary;
  }

  saveDiscussion() {
    if (!this.currentDiscussion.key) {
      this.currentDiscussion.key = `discussion_${Date.now()}`;
    }

    localStorage.setItem(this.currentDiscussion.key, JSON.stringify(this.currentDiscussion));

    if (this.lc.s) {
      this.lc.s.loadKeys();
    }
    return this.currentDiscussion.key;
  }

  async loadDiscussion(key: string) {
    const saved = localStorage.getItem(key);
    if (saved) {
      this.currentDiscussion = JSON.parse(saved);
      // Ensure the key is set
      this.currentDiscussion.key = key;

      try {
        this.lc.llm = await this.lc.createLLM(this.lc.s.getProvider());
      } catch (error) {
        console.error('Error initializing LLM during discussion load:', error);
        throw error;
      }
    }
  }

  getSavedDiscussions() {
    const keys = Object.keys(localStorage).filter(key => key.startsWith('discussion_'));
    return keys.map(key => {
      const discussion = JSON.parse(localStorage.getItem(key) || '{}');
      return {
        key,
        name: discussion.title || 'Untitled Discussion'
      };
    });
  }

  deleteDiscussion(key: string) {
    localStorage.removeItem(key);
    // Simply update the settings service keys
    if (this.lc.s) {
      this.lc.s.loadKeys();
    }
  }
}