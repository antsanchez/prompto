import { Component, ElementRef, ViewChild, HostListener, OnDestroy } from '@angular/core';
import { ChatService } from '../../services/chat.service';
import { SettingsService } from '../../services/settings.service';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { HelpersService } from '../../services/helpers.service';

@Component({
  selector: 'app-arena',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './arena.component.html',
  styleUrl: './arena.component.css'
})
export class ArenaComponent {

  public error: string = '';
  public loading: boolean = false;
  public prompt: string = "";

  public models1: string[] = [];
  public models2: string[] = [];
  public loadingModels1: boolean = false;
  public loadingModels2: boolean = false;
  private destroy$ = new Subject<void>();

  showColumn: 'first' | 'second' = 'first';
  isDesktop: boolean = window.innerWidth > 1024;

  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;

  constructor(
    public cs: ChatService,
    public ss: SettingsService,
    public helpers: HelpersService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
  ) {

    this.cs.newArena();

    try {
      this.loadArenaFromURL();
    } catch (error) {
      this.error = 'There was an error loading the arena from the URL. Please try again.'
      console.error('Error loading arena from URL:', error);
    }

    try {
      this.cs.startArena();
    } catch (error) {
      if (this.cs.arenaShouldBeStarted()) {
        this.error = 'There was an error starting the arena. Please try again.';
        console.error('Error starting arena:', error);
      }
    }

    this.subscribeToRouteParams();
  }

  @HostListener('window:resize')
  onResize() {
    this.isDesktop = window.innerWidth > 1024;
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
        const arenaKey = params.get('chat');
        if (arenaKey) {
          this.cs.loadArena(arenaKey);
        } else {
          this.cs.newArena();
        }
      },
      error: (error) => this.handleError('Error loading chat from URL:', error)
    });
  }

  async chatArena() {
    if (!this.cs.arenaStarted) {
      try {
        this.cs.startArena();
      } catch (error) {
        this.error = 'There was an error starting the arena. Please try again.';
        console.error('Error starting arena:', error);
        return;
      }
    }

    if (this.prompt === '') {
      return;
    }

    this.loading = true;
    let prompt = this.prompt;
    this.prompt = "";
    this.cs.chatArena(prompt).then(() => {
      this.loading = false;
    }, (error) => {
      this.error = 'There was an error chatting in the arena. Please try again.';
      console.error('Error chatting in arena:', error);
      this.loading = false;
    });
  }

  newArena() {
    this.cs.newArena();
    this.cs.startArena();
    this.router.navigate(['/arena', '']);
  }

  async onKeydown() {
    if (this.cs.enterSubmit) {
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
      this.error = 'There was an error getting the models. Please make sure all settings are correct and try again.'
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
      this.error = 'There was an error getting the models. Please make sure all settings are correct and try again.'
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
    let arenaKey = this.activatedRoute.snapshot.paramMap.get('chat') || '';
    if (arenaKey) {
      try {
        this.cs.loadArena(arenaKey);
        this.provider1Changed(this.cs.arena.p1.provider || '');
        this.provider2Changed(this.cs.arena.p2.provider || '');
        this.cs.arena.p1.model = this.cs.arena.p1.model || '';
        this.cs.arena.p2.model = this.cs.arena.p2.model || '';
        this.cs.startArena();
      } catch (error) {
        this.error = 'There was an error loading the arena from the URL. Please try again.'
        console.error('Error loading arena from URL:', error);
      }
    }
  }

  canSend() {
    return this.prompt !== '' && !this.loading && this.cs.arenaStarted;
  }

  private handleError(message: string, error: any): void {
    console.error(message, error);
    this.error = 'There was an error with your request. Please check your connection and settings and try again.';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

}
