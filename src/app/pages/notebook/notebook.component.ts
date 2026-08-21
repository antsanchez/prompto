import { Component, ElementRef, ViewChild, OnDestroy, AfterViewChecked, ChangeDetectionStrategy } from '@angular/core';
import { LcService } from '../../services/lc.service';
import { HelpersService } from '../../services/helpers.service';
import { ErrorService } from '../../services/error.service';
import { FileService } from '../../services/file.service';
import { SharedModule } from '../../shared/shared.module';
import { Subject } from 'rxjs';
import { FileAttachment } from '../../core/types';
import { FILE_LIMITS, ERROR_MESSAGES } from '../../core/constants';
import { extractChunkParts, isAbortError } from '../../core/llm-content';

@Component({
    selector: 'app-notebook',
    imports: [SharedModule],
    templateUrl: './notebook.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./notebook.component.css']
})
export class NotebookComponent implements OnDestroy, AfterViewChecked {
  public loading: boolean = false;
  public prompt: string = "";
  public output: string = "";
  public thinking: string = "";
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
    this.lc.abort();
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
    this.thinking = "";
    this.error = "";
    this.loading = false;
    this.pendingAttachments = [];
  }

  stop() {
    this.lc.abort();
  }

  async invoke() {
    this.loading = true;
    this.output = "";
    this.thinking = "";
    this.shouldScroll = true;
    const signal = this.lc.beginRun();
    try {
      const attachments = [...this.pendingAttachments];
      this.pendingAttachments = [];

      const messages = [{
        role: 'human' as const,
        text: this.prompt,
        attachments: attachments.length > 0 ? attachments : undefined
      }];

      const stream = await this.lc.streamWithMessages(messages, undefined, signal);
      for await (const chunk of stream) {
        if (signal.aborted) {
          break;
        }
        const parts = extractChunkParts(chunk);
        this.output += parts.text;
        this.thinking += parts.thinking;
      }
    } catch (error) {
      if (!isAbortError(error)) {
        this.handleError('Error invoking the model:', error);
        this.lc.s.setConnected(false);
      }
    } finally {
      this.lc.endRun();
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
    this.lc.abort();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private handleError(message: string, error: unknown): void {
    this.error = this.errorService.handleError(message, error);
  }
}
