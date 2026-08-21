import { Injectable } from '@angular/core';
import { LcService } from './lc.service';
import { System } from './settings.service';
import { STORAGE_KEYS } from '../core/constants';
import { StorageService } from './storage.service';
import { extractChunkParts, isAbortError } from '../core/llm-content';

@Injectable({
  providedIn: 'root'
})
export class TemplatesService {

  public system: string = '';
  public prompt: string = '';
  public output: string = '';
  public thinking: string = '';

  constructor(
    public lc: LcService,
    private storage: StorageService
  ) { }

  new() {
    this.lc.s.currentTemplateName = '';
    this.system = '';
    this.prompt = '';
    this.output = '';
    this.thinking = '';

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
      this.storage.setItem(STORAGE_KEYS.TEMPLATES, this.lc.s.templates);
      return;
    }

    this.lc.s.templates.push({ name: this.lc.s.currentTemplateName, system: this.system });
    this.storage.setItem(STORAGE_KEYS.TEMPLATES, this.lc.s.templates);
  }

  // deleteAll removes all templates from local storage
  deleteAll() {
    this.storage.removeItem(STORAGE_KEYS.TEMPLATES);
    this.lc.s.templates = [];
  }

  async stream() {
    this.output = '';
    this.thinking = '';
    const signal = this.lc.beginRun();
    try {
      const stream = await this.lc.streamWithSystemPrompt(this.system, this.prompt, signal);
      for await (const chunk of stream) {
        if (signal.aborted) {
          break;
        }
        const parts = extractChunkParts(chunk);
        this.output += parts.text;
        this.thinking += parts.thinking;
      }
    } catch (error) {
      if (!isAbortError(error)) {
        throw error;
      }
    } finally {
      this.lc.endRun();
    }
  }

  loadTemplate(name: string) {
    this.prompt = '';
    this.output = '';
    this.thinking = '';
    let template = this.lc.s.templates.find((template) => template.name === name);
    if (template) {
      this.lc.s.currentTemplateName = template.name;
      this.system = template.system;
    }
  }
}
