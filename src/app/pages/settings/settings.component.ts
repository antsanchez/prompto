import { Component, OnInit } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { Options, SettingsService, Provider } from '../../services/settings.service';

interface State {
  loading: boolean;
  loadingDelete: boolean;
  error: string;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent implements OnInit {
  public state: State = {
    loading: false,
    loadingDelete: false,
    error: ''
  };

  public options: Options = {} as Options;
  public selectedTab: Provider = Provider.OLLAMA;
  public readonly providers = Provider;

  constructor(public ss: SettingsService) { }

  async ngOnInit(): Promise<void> {
    await this.initializeSettings();
  }

  private async initializeSettings(): Promise<void> {
    try {
      await this.ss.loadSettings();
      this.selectedTab = this.ss.getProvider();
      this.options = this.ss.getOptions();
      await this.loadModels(this.options.provider);
      this.ss.setConnected(true);
    } catch (error) {
      this.handleError('Error initializing settings:', error);
      this.ss.setConnected(false);
    }
  }

  private async loadModels(provider: Provider): Promise<void> {
    this.clearError();
    this.options.availableModels = [];

    try {
      await this.ss.getModels(provider);
      this.options = this.ss.getOptionsFromProvider(provider);
    } catch (error) {
      this.handleError('Error getting models:', error);
    }
  }

  private handleError(message: string, error: unknown, customMessage?: string): void {
    this.state.error = customMessage || 'There was an error getting the models. Please make sure all settings are correct and try again.';
    console.error(message, error);
  }

  private clearError(): void {
    this.state.error = '';
  }

  async providerChanged(provider: Provider): Promise<void> {
    this.options = this.ss.getOptionsFromProvider(provider);
    await this.loadModels(provider);
  }

  async addedApiKey(apiKey: string): Promise<void> {
    this.ss.setApiKeyTemporarily(this.ss.getProvider(), apiKey);
    await this.loadModels(this.options.provider);
  }

  save(): void {
    this.withLoading(() => {
      this.ss.setOptions(this.options);
    });
  }

  private withLoading(action: () => void): void {
    this.state.loading = true;
    try {
      action();
    } finally {
      this.state.loading = false;
    }
  }

  deleteAllLocalStorage(): void {
    this.state.loadingDelete = true;
    if (confirm('Are you sure you want to delete all chat history and templates? This action cannot be undone.')) {
      try {
        this.ss.deleteAll();
      } catch (error) {
        this.handleError(
          'Error deleting local storage:',
          error,
          'There was an error deleting the local storage. Please try again or delete it manually.'
        );
      }
    }
    this.state.loadingDelete = false;
  }

  async selectTab(provider: Provider): Promise<void> {
    this.selectedTab = provider;
    await this.providerChanged(provider);
  }

  async setAsDefault(): Promise<void> {
    this.options = this.ss.getOptionsFromProvider(this.selectedTab);
    await this.loadModels(this.selectedTab);
    this.ss.setOptions(this.options);
    this.ss.saveSettings();
  }
}
