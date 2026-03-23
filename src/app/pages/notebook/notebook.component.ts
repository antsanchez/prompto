import { Component, ElementRef, ViewChild, OnDestroy, AfterViewChecked } from '@angular/core';
import { LcService } from '../../services/lc.service';
import { HelpersService } from '../../services/helpers.service';
import { ErrorService } from '../../services/error.service';
import { FileService } from '../../services/file.service';
import { SharedModule } from '../../shared/shared.module';
import { Subject } from 'rxjs';
import { FileAttachment } from '../../core/types';
import { FILE_LIMITS, ERROR_MESSAGES } from '../../core/constants';

@Component({
    selector: 'app-notebook',
    imports: [SharedModule],
    templateUrl: './notebook.component.html',
    styleUrls: ['./notebook.component.css']
})
export class NotebookComponent implements OnDestroy, AfterViewChecked {
  public loading: boolean = false;
  public prompt: string = "";
  public output: string = "";
  public error: string = "";

  private destroy$ = new Subject<void>();
  private shouldScroll = false;

  // File upload
  pendingAttachments: FileAttachment[] = [];
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;

  constructor(
    public lc: LcService,
    public helpers: HelpersService,
    private errorService: ErrorService,
    public fileService: FileService
  ) {
    this.lc.s.checkConnection();
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.shouldScroll = false;
      this.myScrollContainer.nativeElement.scrollIntoView({ behavior: 'smooth' });
    }
  }

  new() {
    this.resetNotebook();

    try {
      this.lc.s.loadSettings();
    } catch (error) {
      this.handleError('Error loading settings:', error);
      return;
    }

    this.createLLM();
  }

  private async createLLM() {
    try {
      const llm = await this.lc.createLLM(this.lc.s.getProvider());
      this.lc.llm = llm;
      this.lc.s.setConnected(true);
    } catch (error) {
      this.handleError('Error creating LLM:', error);
      this.lc.s.setConnected(false);
    }
  }

  private resetNotebook() {
    this.prompt = "";
    this.output = "";
    this.error = "";
    this.loading = false;
    this.pendingAttachments = [];
  }

  async invoke() {
    this.loading = true;
    this.output = "";
    this.shouldScroll = true;
    try {
      const attachments = [...this.pendingAttachments];
      this.pendingAttachments = [];

      // Use streamWithMessages for multimodal support
      const messages = [{
        role: 'human' as const,
        text: this.prompt,
        attachments: attachments.length > 0 ? attachments : undefined
      }];

      const stream = await this.lc.streamWithMessages(messages);
      for await (let chunk of stream) {
        this.output += chunk?.content;
      }
    } catch (error) {
      this.handleError('Error invoking the model:', error);
      this.lc.s.setConnected(false);
    } finally {
      this.loading = false;
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private handleError(message: string, error: unknown): void {
    this.error = this.errorService.handleError(message, error);
  }
}
