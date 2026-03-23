import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HelpersService } from '../../services/helpers.service';

@Component({
    selector: 'app-message-display',
    imports: [CommonModule],
    templateUrl: './message-display.component.html'
})
export class MessageDisplayComponent {
  @Input() message: string = '';
  @Input() cssClass: string = '';

  showRaw: boolean = false;
  copied: boolean = false;

  constructor(public helpers: HelpersService) {}

  toggleView() {
    this.showRaw = !this.showRaw;
  }

  async copyToClipboard() {
    try {
      await navigator.clipboard.writeText(this.message);
      this.copied = true;
      setTimeout(() => this.copied = false, 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = this.message;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      this.copied = true;
      setTimeout(() => this.copied = false, 2000);
    }
  }
}
