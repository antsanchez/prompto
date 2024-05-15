import { Injectable } from '@angular/core';
import { LcService } from './lc.service';
import { System } from './settings.service';

@Injectable({
  providedIn: 'root'
})
export class TemplatesService {

  public system: string = '';
  public prompt: string = '';
  public output: string = '';

  constructor(
    public lc: LcService) { }

  new() {
    this.lc.s.currentTemplateName = '';
    this.system = '';
    this.prompt = '';
    this.output = '';

    this.lc.s.loadTemplates();
    this.lc.s.loadSettings();
    this.lc.createLLM(this.lc.s.getProvider()).then((llm) => {
      this.lc.llm = llm;
    }, (error) => {
      console.error('Error creating LLM:', error);
      throw new Error('Error creating LLM');
    });
  }

  isConnected() {
    return this.lc.s.isConnected();
  }

  setConnected(connected: boolean) {
    this.lc.s.setConnected(connected);
  }

  // Saves the template to local storage
  save() {
    if (this.lc.s.currentTemplateName === '') {
      return;
    }

    this.lc.s.loadTemplates()

    // if template exists by name, update it
    let existing = this.lc.s.templates.find((template: System) => template.name === this.lc.s.currentTemplateName) as System;
    if (existing) {
      existing.system = this.system;
      localStorage.setItem('templates', JSON.stringify(this.lc.s.templates));
      return;
    }

    this.lc.s.templates.push({ name: this.lc.s.currentTemplateName, system: this.system });
    localStorage.setItem('templates', JSON.stringify(this.lc.s.templates));
  }

  // deleteAll removes all templates from local storage
  deleteAll() {
    localStorage.removeItem('templates');
    this.lc.s.templates = [] as System[];
  }

  async stream() {
    this.output = '';
    let stream = await this.lc.streamWithSystemPrompt(this.system, this.prompt);
    for await (let chunk of stream) {
      this.output += chunk?.content;
    }
  }

  loadTemplate(name: string) {
    this.prompt = '';
    this.output = '';
    let template = this.lc.s.templates.find((template) => template.name === name);
    if (template) {
      this.lc.s.currentTemplateName = template.name;
      this.system = template.system;
    }
  }
} 
