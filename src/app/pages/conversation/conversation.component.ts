import { Component } from '@angular/core';
import { LcService } from '../../services/lc.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';

@Component({
  selector: 'app-conversation',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './conversation.component.html',
  styleUrl: './conversation.component.css'
})
export class ConversationComponent {

  public loading: boolean = false;
  public prompt: string = "";
  public chatKey: string = "";

  constructor(
    public lcService: LcService,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {
    this.lcService.newChat();
    this.loadChatFromURL();
  }

  async chat() {
    this.loading = true;
    this.lcService.chat(this.prompt).then(() => {
      this.prompt = "";
      this.loading = false;
    })
  }

  loadChatFromURL() {
    this.chatKey = this.activatedRoute.snapshot.paramMap.get('chat') || '';
    if (this.chatKey) {
      this.lcService.loadChat(this.chatKey);
    }
  }

  newChat() {
    this.lcService.newChat();
    this.router.navigate(['/conversation', '']);
  }

  // presentMessage converts the LLM output to HTML
  presentMessage(message: string) {
    return message
      .replace(/(?:\r\n|\r|\n)/g, '<br>')
      .replace(/(https?:\/\/[^\s]+)(?![\w/])/g, '<a href="$1" target="_blank">$1</a>');
  }
}
