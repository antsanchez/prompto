import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ChatService } from '../../services/chat.service';
import { marked } from 'marked';
import { HelpersService } from '../../services/helpers.service';

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

  constructor(
    public chatService: ChatService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    public helpers: HelpersService,
  ) {
    this.chatService.new();
    this.loadChatFromURL();
  }

  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    this.myScrollContainer.nativeElement.scrollIntoView();
  }

  async chat() {
    this.loading = true;
    this.chatService.chat(this.prompt).then(() => {
      this.prompt = "";
      this.loading = false;
    })
  }

  loadChatFromURL() {
    let chatKey = this.activatedRoute.snapshot.paramMap.get('chat') || '';
    if (chatKey) {
      this.chatService.loadChat(chatKey);
    }
  }

  newChat() {
    this.chatService.new();
    this.router.navigate(['/conversation', '']);
  }
}
