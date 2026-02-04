import { Component, ElementRef, ViewChild, OnDestroy, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ChatService } from '../../services/chat.service';
import { HelpersService } from '../../services/helpers.service';
import { ErrorService } from '../../services/error.service';
import { FileService } from '../../services/file.service';
import { SharedModule } from '../../shared/shared.module';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UI, FILE_LIMITS, ERROR_MESSAGES } from '../../core/constants';
import { FileAttachment } from '../../core/types';

@Component({
  selector: 'app-conversation',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './conversation.component.html',
  styleUrls: ['./conversation.component.css']
})
export class ConversationComponent implements OnDestroy {
  protected Math = Math; // Add this line to make Math available in template
  public loading: boolean = false;
  public prompt: string = "";
  public error: string = "";
  public waiting: boolean = false;
  isDesktop: boolean = window.innerWidth > UI.DESKTOP_BREAKPOINT;
  private destroy$ = new Subject<void>();

  // File upload
  pendingAttachments: FileAttachment[] = [];
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;

  constructor(
    public chatService: ChatService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    public helpers: HelpersService,
    private errorService: ErrorService,
    public fileService: FileService
  ) {
    this.handleNewChat();
    this.loadChatFromURL();
    this.subscribeToRouteParams();
    this.chatService.checkConnection();

    this.chatService.streamStarted.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.waiting = false;
    });
  }

  @HostListener('window:resize')
  onResize() {
    this.isDesktop = window.innerWidth > UI.DESKTOP_BREAKPOINT;
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
    this.waiting = true;
    try {
      let prompt = this.prompt;
      let attachments = [...this.pendingAttachments];
      this.prompt = "";
      this.pendingAttachments = [];
      await this.chatService.chat(prompt, attachments.length > 0 ? attachments : undefined);
      this.chatService.setConnected(true);
    } catch (error) {
      this.handleError('Error chatting:', error);
      this.chatService.setConnected(false);
    } finally {
      this.loading = false;
      this.waiting = false;
    }
  }

  triggerFileInput() {
    this.fileInput.nativeElement.click();
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    for (const file of Array.from(input.files)) {
      if (this.pendingAttachments.length >= FILE_LIMITS.MAX_ATTACHMENTS) {
        this.error = ERROR_MESSAGES.MAX_ATTACHMENTS_REACHED;
        break;
      }

      try {
        const attachment = await this.fileService.processFile(file);
        this.pendingAttachments.push(attachment);
      } catch (error) {
        this.handleError('Error processing file:', error);
      }
    }

    // Reset input so same file can be selected again
    input.value = '';
  }

  removeAttachment(index: number) {
    this.pendingAttachments.splice(index, 1);
  }

  canSend(): boolean {
    return !this.loading && (!!this.prompt.trim() || this.pendingAttachments.length > 0);
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

  private handleError(message: string, error: unknown) {
    this.error = this.errorService.handleError(message, error);
  }
}
