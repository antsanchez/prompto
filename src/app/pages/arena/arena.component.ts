import { Component, ElementRef, ViewChild, HostListener, OnDestroy } from '@angular/core';
import { ChatService } from '../../services/chat.service';
import { SettingsService } from '../../services/settings.service';
import { ErrorService } from '../../services/error.service';
import { FileService } from '../../services/file.service';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { HelpersService } from '../../services/helpers.service';
import { UI, ERROR_MESSAGES, FILE_LIMITS } from '../../core/constants';
import { FileAttachment } from '../../core/types';

@Component({
  selector: 'app-arena',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './arena.component.html',
  styleUrl: './arena.component.css'
})
export class ArenaComponent {
  protected Math = Math; // Add this line
  public error: string = '';
  public loading: boolean = false;
  public prompt: string = "";

  public models1: string[] = [];
  public models2: string[] = [];
  public loadingModels1: boolean = false;
  public loadingModels2: boolean = false;
  private destroy$ = new Subject<void>();

  showColumn: 'first' | 'second' = 'first';
  isDesktop: boolean = window.innerWidth > UI.DESKTOP_BREAKPOINT;

  // File upload
  pendingAttachments: FileAttachment[] = [];
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;

  constructor(
    public cs: ChatService,
    public ss: SettingsService,
    public helpers: HelpersService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private errorService: ErrorService,
    public fileService: FileService
  ) {

    this.cs.newArena();

    try {
      this.loadArenaFromURL();
    } catch (error) {
      this.error = ERROR_MESSAGES.ARENA_LOAD;
      console.error('Error loading arena from URL:', error);
    }

    try {
      this.cs.startArena();
    } catch (error) {
      if (this.cs.arenaShouldBeStarted()) {
        this.error = ERROR_MESSAGES.ARENA_START;
        console.error('Error starting arena:', error);
      }
    }

    this.subscribeToRouteParams();
  }

  @HostListener('window:resize')
  onResize() {
    this.isDesktop = window.innerWidth > UI.DESKTOP_BREAKPOINT;
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    this.myScrollContainer.nativeElement.scrollIntoView();
  }

  private subscribeToRouteParams() {
    this.activatedRoute.paramMap.pipe(takeUntil(this.destroy$)).subscribe({
      next: (params) => {
        const arenaKey = params.get('arena');
        if (arenaKey) {
          this.cs.loadArena(arenaKey);
        } else {
          this.cs.newArena();
        }
      },
      error: (error) => this.handleError('Error loading arena from URL:', error)
    });
  }

  async chatArena() {
    if (!this.cs.arenaStarted) {
      try {
        this.cs.startArena();
      } catch (error) {
        this.error = ERROR_MESSAGES.ARENA_START;
        console.error('Error starting arena:', error);
        return;
      }
    }

    if (this.prompt === '' && this.pendingAttachments.length === 0) {
      return;
    }

    this.loading = true;
    let prompt = this.prompt;
    let attachments = [...this.pendingAttachments];
    this.prompt = "";
    this.pendingAttachments = [];
    this.cs.chatArena(prompt, attachments.length > 0 ? attachments : undefined).then(() => {
      this.loading = false;
    }, (error) => {
      this.error = ERROR_MESSAGES.ARENA_CHAT;
      console.error('Error chatting in arena:', error);
      this.loading = false;
    });
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

  newArena() {
    this.cs.newArena();
    this.cs.startArena();
    this.router.navigate(['/arena', '']);
  }

  async onKeydown() {
    if (this.cs.enterSubmit && this.canSend()) {
      this.chatArena();
    }
  }

  async getModels(provider: any): Promise<string[]> {
    await this.ss.getModels(provider);
    return this.ss.getAvailableModels(provider);
  }

  async provider1Changed(provider: any) {
    this.loadingModels1 = true;
    try {
      this.models1 = await this.getModels(provider);
      this.loadingModels1 = false;
    } catch (error) {
      this.error = ERROR_MESSAGES.MODELS_FETCH;
      console.error('Error getting models:', error);
      this.loadingModels1 = false;
    }
  }

  async provider2Changed(provider: any) {
    this.loadingModels2 = true;
    try {
      this.models2 = await this.getModels(provider);
      this.loadingModels2 = false;
    } catch (error) {
      this.error = ERROR_MESSAGES.MODELS_FETCH;
      console.error('Error getting models:', error);
      this.loadingModels2 = false;
    }
  }

  onModel1Change(model: string) {
    this.cs.arena.p1.model = model;
    this.cs.startArena();
  }

  onModel2Change(model: string) {
    this.cs.arena.p2.model = model;
    this.cs.startArena();
  }

  models1Available() {
    return this.models1.length > 0 && (this.cs.arena.p1.provider !== '' && this.cs.arena.p1.provider !== undefined) && !this.loadingModels1;
  }

  models2Available() {
    return this.models2.length > 0 && (this.cs.arena.p2.provider !== '' && this.cs.arena.p2.provider !== undefined) && !this.loadingModels2;
  }

  models1Error() {
    return this.models1.length === 0 && (this.cs.arena.p1.provider !== '' && this.cs.arena.p1.provider !== undefined) && !this.loadingModels1;
  }

  models2Error() {
    return this.models2.length === 0 && (this.cs.arena.p2.provider !== '' && this.cs.arena.p2.provider !== undefined) && !this.loadingModels2;
  }

  async loadArenaFromURL() {
    let arenaKey = this.activatedRoute.snapshot.paramMap.get('arena') || '';
    if (arenaKey) {
      try {
        this.cs.loadArena(arenaKey);
        this.provider1Changed(this.cs.arena.p1.provider || '');
        this.provider2Changed(this.cs.arena.p2.provider || '');
        this.cs.arena.p1.model = this.cs.arena.p1.model || '';
        this.cs.arena.p2.model = this.cs.arena.p2.model || '';
        this.cs.startArena();
      } catch (error) {
        this.error = ERROR_MESSAGES.ARENA_LOAD;
        console.error('Error loading arena from URL:', error);
      }
    }
  }

  modelsSelected(): boolean {
    return !!(this.cs.arena.p1.model && this.cs.arena.p1.model.trim() !== '' &&
      this.cs.arena.p2.model && this.cs.arena.p2.model.trim() !== '');
  }

  canSend(): boolean {
    return !this.loading &&
      (!!this.prompt.trim() || this.pendingAttachments.length > 0) &&
      this.modelsSelected();
  }

  private handleError(message: string, error: unknown): void {
    this.error = this.errorService.handleError(message, error);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

}
