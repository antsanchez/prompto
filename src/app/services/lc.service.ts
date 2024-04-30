import { Injectable } from '@angular/core';
import { Ollama } from "@langchain/community/llms/ollama";
import { PromptTemplate } from "@langchain/core/prompts";
import { HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { OpenAI } from "@langchain/openai";

export type Settings = {
  provider: string;
  model: string;
  apiKey: string;
  ollamaURL: string;
  ollamaModels: string[];
};

@Injectable({
  providedIn: 'root'
})
export class LcService {

  public settings: Settings = {
    provider: 'Ollama',
    model: "",
    apiKey: '',
    ollamaURL: 'http://localhost:11434',
    ollamaModels: []
  } as Settings;

  public providers = [
    'Ollama',
  ];

  public llm: Ollama = new Ollama({
    baseUrl: this.settings.ollamaURL,
    model: this.settings.model,
  });

  constructor(private http: HttpClient) { }

  createLLM(): void {
    if (this.settings.provider === 'Ollama') {
      this.llm = new Ollama({
        baseUrl: this.settings.ollamaURL,
        model: this.settings.model,
      });
      return;
    }
  }

  // saveSettings saves the settings to the local storage
  saveSettings() {
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

  // Get ollama models from the server
  async getOllamaModels() {
    let self = this;
    const url = 'http://localhost:11434/api/tags';
    this.http.get(url)
      .pipe(catchError((err) => {
        console.error('Error getting models', err);
        return [];
      }))
      .subscribe({
        next(data: any) {
          self.settings.ollamaModels = [] as string[];
          for (let model of data?.models as any[]) {
            self.settings.ollamaModels.push(model?.name);
          }
        },
        error(error) {
          console.error('There was an error!', error);
        }
      });
  }

  // streamWithTemplate sends a prompt to the chatbot with a template and returns a stream of responses
  streamWithSystemPrompt(system: string, prompt: string) {

    let template = system + ` ${prompt}`

    let tpl = PromptTemplate.fromTemplate(template);

    let chain = tpl.pipe(this.llm);

    return chain.stream({ prompt: prompt });
  }
}
