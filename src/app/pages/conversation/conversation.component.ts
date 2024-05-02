import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ChatService } from '../../services/chat.service';
import { HelpersService } from '../../services/helpers.service';
import { ErrorComponent } from '../../components/error/error.component';
import { NotConnectedComponent } from '../../components/not-connected/not-connected.component';

@Component({
  selector: 'app-conversation',
  standalone: true,
  imports: [FormsModule, CommonModule, ErrorComponent, NotConnectedComponent],
  templateUrl: './conversation.component.html',
  styleUrl: './conversation.component.css'
})
export class ConversationComponent {

  public loading: boolean = false;
  public prompt: string = "";
  public error: string = "";

  constructor(
    public chatService: ChatService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    public helpers: HelpersService,
  ) {
    try {
      this.chatService.new();
    } catch (error) {
      this.error = 'There was an error creating a new chat. Are you connected to the LLM? Please make sure your settings are correct and try again.';
      console.error('Error creating new chat:', error);
      return;
    }

    try {
      this.loadChatFromURL();
    } catch (error) {
      this.error = 'There was an error loading the chat from the URL. Please try again.'
      console.error('Error loading chat from URL:', error);
    }
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
    }, (error) => {
      this.error = 'Are you connected to the LLM? Please make sure your settings are correct and try again.'
      console.error('Error chatting:', error);
      this.loading = false;
    });
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
