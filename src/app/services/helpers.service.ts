import { Injectable } from '@angular/core';
import { marked } from 'marked';
import { DomSanitizer } from '@angular/platform-browser';
import hljs from 'highlight.js'; // Import highlight.js

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
      const lang = (infostring || '').match(/\S*/)?.[0] || 'plaintext';
      const highlighted = hljs.highlight(lang, code).value;
      return `<pre class="chat-code"><code class="hljs ${lang}">${highlighted}</code></pre>`;
    };

    // Use the custom renderer
    const parsedHtml = marked(message, { renderer });

    // Sanitize and return the HTML
    return this.sanitizer.bypassSecurityTrustHtml(parsedHtml as string);
  }
}
