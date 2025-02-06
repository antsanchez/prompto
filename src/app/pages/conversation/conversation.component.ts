import { Component, ElementRef, ViewChild, OnDestroy, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ChatService } from '../../services/chat.service';
import { HelpersService } from '../../services/helpers.service';
import { SharedModule } from '../../shared/shared.module';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-conversation',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './conversation.component.html',
  styleUrls: ['./conversation.component.css']
})
export class ConversationComponent implements OnDestroy {
  public loading: boolean = false;
  public prompt: string = "";
  public error: string = "";
  isDesktop: boolean = window.innerWidth > 1024;
  private destroy$ = new Subject<void>();

  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;

  constructor(
    public chatService: ChatService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    public helpers: HelpersService
  ) {
    this.handleNewChat();
    this.loadChatFromURL();
    this.subscribeToRouteParams();
    this.chatService.checkConnection();
  }

  @HostListener('window:resize')
  onResize() {
    this.isDesktop = window.innerWidth > 1024;
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    this.myScrollContainer.nativeElement.scrollIntoView({ behavior: 'smooth' });
  }

  private subscribeToRouteParams() {
    this.activatedRoute.paramMap.pipe(takeUntil(this.destroy$)).subscribe({
      next: (params) => {
        const chatKey = params.get('chat') || '';
        if (chatKey) {
          this.chatService.loadChat(chatKey);
        } else {
          this.newChat();
        }
      },
      error: (error) => {
        this.handleError('Error loading chat from URL:', error);
      }
    });
  }


  private async handleNewChat() {
    try {
      await this.chatService.newChat();
    } catch (error) {
      this.handleError('Error creating a new chat:', error);
    }
  }

  private async loadChatFromURL() {
    try {
      const chatKey = this.activatedRoute.snapshot.paramMap.get('chat') || '';
      if (chatKey) {
        await this.chatService.loadChat(chatKey);
      }
    } catch (error) {
      this.handleError('Error loading chat from URL:', error);
    }
  }

  async chat() {
    this.loading = true;
    try {
      let prompt = this.prompt;
      this.prompt = "";
      await this.chatService.chat(prompt);
      this.chatService.setConnected(true);
    } catch (error) {
      this.handleError('Error chatting:', error);
      this.chatService.setConnected(false);
    } finally {
      this.loading = false;
    }
  }

  async onKeydown() {
    if (this.chatService.enterSubmit) {
      this.chat();
    }
  }

  newChat() {
    this.handleNewChat();
    this.router.navigate(['/conversation', '']);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private handleError(message: string, error: any) {
    console.error(message, error);
    this.error = 'There was an error with your request. Please check your connection and settings and try again.';
  }
}
