import { Injectable } from '@angular/core';
import { marked } from 'marked';

@Injectable({
  providedIn: 'root'
})
export class HelpersService {

  constructor() { }

  // presentMessage converts the LLM output to HTML
  presentMessage(message: string) {
    message = message
      .replace(/(?:\r\n|\r|\n)/g, '<br>')
      .replace(/(https?:\/\/[^\s]+)(?![\w/])/g, '<a href="$1" target="_blank">$1</a>');

    return marked.parse(message);
  }
}
