import { Injectable } from '@angular/core';
import { LcService } from './lc.service';

export type System = {
  name: string;
  system: string;
};

@Injectable({
  providedIn: 'root'
})
export class TemplatesService {

  public templates: System[] = [] as System[];

  public system: string = '';
  public prompt: string = '';
  public output: string = '';
  public name: string = '';

  constructor(private lc: LcService) { }

  new() {
    this.name = '';
    this.system = '';
    this.prompt = '';
    this.output = '';
  }

  // get retrieves the templates from local storage
  loadTemplates() {
    let tmpl = localStorage.getItem('templates');
    if (tmpl === null) {
      this.templates = [] as System[];
    } else {
      this.templates = JSON.parse(tmpl);
    }
  }

  // Saves the template to local storage
  save() {
    if (this.name === '') {
      return;
    }

    this.loadTemplates()

    // if template exists by name, update it
    let existing = this.templates.find((template: System) => template.name === this.name) as System;
    if (existing) {
      existing.system = this.system;
      localStorage.setItem('templates', JSON.stringify(this.templates));
      return;
    }

    this.templates.push({ name: this.name, system: this.system });
    localStorage.setItem('templates', JSON.stringify(this.templates));
  }


  async stream() {
    this.output = '';
    let stream = await this.lc.streamWithSystemPrompt(this.system, this.prompt);
    for await (let chunk of stream) {
      this.output += chunk;
    }
  }

  loadTemplate(name: string) {
    this.prompt = '';
    this.output = '';
    let template = this.templates.find((template) => template.name === name);
    if (template) {
      this.name = template.name;
      this.system = template.system;
    }
  }

  deleteTemplate(name: string) {
    this.loadTemplates();
    this.templates = this.templates.filter((template) => template.name !== name);
    localStorage.setItem('templates', JSON.stringify(this.templates));
  }
} 
