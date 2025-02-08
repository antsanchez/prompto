import { Injectable } from '@angular/core';
import { marked } from 'marked';
import { DomSanitizer } from '@angular/platform-browser';
import hljs from 'highlight.js';

@Injectable({
  providedIn: 'root'
})
export class HelpersService {
  constructor(private sanitizer: DomSanitizer) {
    // Configure marked to use custom renderer
    marked.setOptions({
      breaks: true,
      gfm: true
    });
  }

  presentMessage(message: string) {
    // Custom renderer to add CSS classes for styling
    const renderer = new marked.Renderer();

    renderer.link = (href, title, text) => {
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    };

    renderer.paragraph = (text) => {
      return `<p class="chat-paragraph">${text}</p>`;
    };

    renderer.code = (code, infostring) => {
      let lang = (infostring || '').match(/\S*/)?.[0] || 'plaintext';

      // Check if the language is supported by highlight.js
      if (lang && !hljs.getLanguage(lang)) {
        console.warn(`Language '${lang}' not found, falling back to plaintext`);
        lang = 'plaintext';
      }

      let highlighted;
      try {
        highlighted = hljs.highlight(code, { language: lang }).value;
      } catch (e) {
        console.warn('Highlighting failed, falling back to escaped plain text');
        highlighted = hljs.highlight(code, { language: 'plaintext' }).value;
      }

      return `<pre class="chat-code"><code class="hljs ${lang}">${highlighted}</code></pre>`;
    };

    // Use the custom renderer
    const parsedHtml = marked(message, { renderer });

    // Sanitize and return the HTML
    return this.sanitizer.bypassSecurityTrustHtml(parsedHtml as string);
  }
}
