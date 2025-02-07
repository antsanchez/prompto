import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DiscussionService } from '../../services/discussion.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { NotConnectedComponent } from '../../components/not-connected/not-connected.component';
import { ErrorComponent } from '../../components/error/error.component';
import { HelpersService } from '../../services/helpers.service';

@Component({
  selector: 'app-discussion',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NotConnectedComponent,
    ErrorComponent
  ],
  templateUrl: './discussion.component.html',
  styleUrl: './discussion.component.css'
})
export class DiscussionComponent implements OnInit {
  form: FormGroup;
  isLoading = false;
  messages: any[] = [];
  isFormCollapsed = false;
  summary: string = '';
  savedDiscussions: any[] = [];
  public error: string = "";
  private destroy$ = new Subject<void>();
  showInfo = false;

  private randomNames = [
    'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Oliver', 'Isabella', 'William',
    'Sophia', 'James', 'Charlotte', 'Benjamin', 'Mia', 'Lucas', 'Harper', 'Henry',
    'Amelia', 'Alexander', 'Evelyn', 'Mason', 'Abigail', 'Michael', 'Emily', 'Daniel'
  ];

  private getRandomName(usedNames: string[]): string {
    const availableNames = this.randomNames.filter(name => !usedNames.includes(name));
    if (availableNames.length === 0) return `Agent ${Math.random().toString(36).substr(2, 5)}`;
    return availableNames[Math.floor(Math.random() * availableNames.length)];
  }

  constructor(
    private fb: FormBuilder,
    public discussionService: DiscussionService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    public helpers: HelpersService
  ) {
    this.form = this.fb.group({
      title: [''],
      context: [''],
      agentCount: [2],
      maxRounds: [3],
      agentDescriptions: this.fb.array([])
    });

    this.discussionService.checkConnection()
    this.updateAgentDescriptions();
    this.loadSavedDiscussions();
    this.subscribeToRouteParams();
    this.loadDiscussionFromURL();
  }

  ngOnInit() {
  }

  toggleForm() {
    this.isFormCollapsed = !this.isFormCollapsed;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private subscribeToRouteParams() {
    this.activatedRoute.paramMap.pipe(takeUntil(this.destroy$)).subscribe({
      next: (params) => {
        const discussionKey = params.get('discussion') || '';
        if (discussionKey) {
          this.loadDiscussion(discussionKey);
        } else {
          this.newDiscussion();
        }
      },
      error: (error) => {
        this.handleError('Error loading chat from URL:', error);
      }
    });
  }

  newDiscussion() {
    this.discussionService.newDiscussion();
    this.router.navigate(['/discussion', '']);
  }

  private async loadDiscussionFromURL() {
    try {
      const key = this.activatedRoute.snapshot.params['discussion'];
      if (key) {
        await this.loadDiscussion(key);
      }
    } catch (error) {
      this.handleError('Error loading chat from URL:', error);
    }
  }

  get agentDescriptions() {
    return this.form.get('agentDescriptions') as FormArray;
  }

  updateAgentDescriptions() {
    const agentCount = this.form.get('agentCount')?.value || 0;
    const formArray = this.form.get('agentDescriptions') as FormArray;
    const currentValues = formArray.value;
    const usedNames: string[] = [];

    // Clear existing controls
    while (formArray.length) {
      formArray.removeAt(0);
    }

    // Add form groups, preserving existing values where possible
    for (let i = 0; i < agentCount; i++) {
      const existingAgent = currentValues[i];
      const name = existingAgent?.name || this.getRandomName(usedNames);
      usedNames.push(name);

      formArray.push(
        this.fb.group({
          name: [name],
          description: [existingAgent?.description || '']
        })
      );
    }
  }

  async onSubmit() {
    if (this.form.valid) {
      this.isLoading = true;
      this.error = '';
      try {
        const agentData = this.agentDescriptions.value.map((agent: any) => ({
          name: agent.name || `Agent ${this.agentDescriptions.value.indexOf(agent) + 1}`,
          description: agent.description
        }));

        await this.discussionService.createDiscussion(
          this.form.get('title')?.value,
          this.form.get('context')?.value,
          agentData
        );

        const maxRounds = this.form.get('maxRounds')?.value || 3;
        await this.discussionService.continueDiscussion(maxRounds);
        this.isFormCollapsed = true;
        this.discussionService.setConnected(true);
        await this.saveDiscussion(); // Automatically save
      } catch (error) {
        this.handleError('Failed to start discussion:', error);
        this.discussionService.setConnected(false);
      } finally {
        this.isLoading = false;
      }
    }
  }

  async continueDiscussion() {
    this.isLoading = true;
    this.error = '';
    try {
      const maxRounds = this.form.get('maxRounds')?.value || 1;
      await this.discussionService.continueDiscussion(maxRounds);
      this.messages = this.discussionService.currentDiscussion.messages;
      this.discussionService.setConnected(true);
      await this.saveDiscussion(); // Automatically save
    } catch (error) {
      this.handleError('Failed to continue discussion:', error);
      this.discussionService.setConnected(false);
    } finally {
      this.isLoading = false;
    }
  }

  async summarizeDiscussion() {
    this.isLoading = true;
    this.error = '';
    try {
      this.summary = await this.discussionService.summarizeDiscussion();
      this.discussionService.setConnected(true);
      await this.saveDiscussion(); // Automatically save
    } catch (error) {
      this.handleError('Failed to summarize discussion:', error);
      this.discussionService.setConnected(false);
    } finally {
      this.isLoading = false;
    }
  }

  private async saveDiscussion() {
    try {
      await this.discussionService.saveDiscussion();
    } catch (error) {
      console.error('Error saving discussion:', error);
    }
  }

  async loadDiscussion(key: string) {
    try {
      const discussion = await this.discussionService.loadDiscussion(key);
      if (this.discussionService.currentDiscussion) {
        this.summary = this.discussionService.currentDiscussion.summary || '';
      }
    } catch (error) {
      this.handleError('Failed to load discussion:', error);
    }
  }

  loadSavedDiscussions() {
    this.savedDiscussions = this.discussionService.getSavedDiscussions();
  }

  deleteDiscussion(key: string) {
    this.discussionService.deleteDiscussion(key);
    this.loadSavedDiscussions();
  }

  private handleError(message: string, error: any) {
    console.error(message, error);
    let errorMessage = 'An unexpected error occurred.';

    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    this.error = `${message} ${errorMessage}`;
    setTimeout(() => this.error = '', 5000); // Clear error after 5 seconds
  }
}