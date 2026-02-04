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

    renderer.link = ({ href, tokens }: { href: string; title?: string | null; tokens: unknown[] }) => {
      const text = this.parseInlineTokens(tokens);
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    };

    renderer.paragraph = ({ tokens }: { tokens: unknown[] }) => {
      const text = this.parseInlineTokens(tokens);
      return `<p class="chat-paragraph">${text}</p>`;
    };

    renderer.code = ({ text, lang }: { text: string; lang?: string; escaped?: boolean }) => {
      let language = (lang || '').match(/\S*/)?.[0] || 'plaintext';

      // Check if the language is supported by highlight.js
      if (language && !hljs.getLanguage(language)) {
        console.warn(`Language '${language}' not found, falling back to plaintext`);
        language = 'plaintext';
      }

      let highlighted;
      try {
        highlighted = hljs.highlight(text, { language }).value;
      } catch (e) {
        console.warn('Highlighting failed, falling back to escaped plain text');
        highlighted = hljs.highlight(text, { language: 'plaintext' }).value;
      }

      return `<pre class="chat-code"><code class="hljs ${language}">${highlighted}</code></pre>`;
    };

    // Use the custom renderer
    const parsedHtml = marked(message, { renderer });

    // Sanitize and return the HTML
    return this.sanitizer.bypassSecurityTrustHtml(parsedHtml as string);
  }

  private parseInlineTokens(tokens: unknown[]): string {
    return (tokens as Array<{ raw?: string }>).map(t => t.raw || '').join('');
  }
}
