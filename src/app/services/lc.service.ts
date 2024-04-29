import { Injectable } from '@angular/core';
import { Ollama } from "@langchain/community/llms/ollama";
import { PromptTemplate } from "@langchain/core/prompts";

@Injectable({
  providedIn: 'root'
})
export class LcService {

  public llm = new Ollama({
    baseUrl: "http://localhost:11434", // Default value
    model: "llama3", // Default value
  });

  constructor() { }

  // invoke sends a prompt to the chatbot and returns the response
  invoke(prompt: string): Promise<string> {
    return this.llm.invoke(prompt);
  }

  // stream sends a prompt to the chatbot and returns a stream of responses
  stream(prompt: string) {
    return this.llm.stream(prompt);
  }

  // streamWithTemplate sends a prompt to the chatbot with a template and returns a stream of responses
  streamWithSystemPrompt(system: string, prompt: string) {

    let template = system + `\nUser Prompt: ${prompt}`

    let tpl = PromptTemplate.fromTemplate(template);

    let chain = tpl.pipe(this.llm);

    return chain.stream({ prompt: prompt });
  }
}
