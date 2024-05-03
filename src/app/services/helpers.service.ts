import { Injectable } from '@angular/core';
import { marked } from 'marked';
import { DomSanitizer } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root'
})
export class HelpersService {

  constructor(private sanitizer: DomSanitizer) { }

  // presentMessage converts the LLM output to HTML
  presentMessage(message: string) {
    // First, replace URLs with anchor tags
    message = message.replace(/(https?:\/\/[^\s]+)(?![\w/])/g, '<a href="$1" target="_blank">$1</a>');
    // Then, parse the markdown to HTML
    let parsedHtml = marked.parse(message).toString();
    // Finally, replace newline characters with <br> tags
    parsedHtml = parsedHtml.replace(/(?:\r\n|\r|\n)/g, '<br>');
    // Use DomSanitizer to bypass Angular's HTML sanitizer
    return this.sanitizer.bypassSecurityTrustHtml(parsedHtml);
  }
}
