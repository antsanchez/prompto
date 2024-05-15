import { Component } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { Options, SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent {

  public loading = false;
  public loadingDelete = false;
  public options: Options = {} as Options;
  public error: string = '';

  constructor(
    public ss: SettingsService,
  ) {

  }

  async ngOnInit() {
    try {
      // Load settings
      await this.ss.loadSettings();

      // Get options
      this.options = this.ss.getOptions();

      // Get models
      await this.ss.getModels(this.options.provider);
      this.ss.setConnected(true);
    } catch (error) {
      this.ss.setConnected(false);
      console.error('Error initializing settings:', error);
    }
  }

  async providerChanged(provider: any) {
    this.options = this.ss.getOptionsFromProvider(provider);
    try {
      await this.ss.getModels(provider);
      this.options.availableModels = this.ss.getAvailableModels(provider);
    } catch (error) {
      this.error = 'There was an error getting the models. Please make sure all settings are correct and try again.';
      console.error('Error getting models:', error);
    }
  }

  async addedApiKey(apiKey: string) {
    this.ss.setApiKeyTemporarily(this.ss.getProvider(), apiKey);
    try {
      await this.ss.getModels(this.options.provider);
      this.options.availableModels = this.ss.getAvailableModels(this.options.provider);
    } catch (error) {
      this.error = 'There was an error getting the models. Please make sure all settings are correct and try again.';
      console.error('Error getting models:', error);
    }
  }

  save() {
    this.loading = true;
    this.ss.setOptions(this.options);
    this.loading = false;
  }

  deleteAllLocalStorage() {
    this.loadingDelete = true;
    if (confirm('Are you sure you want to delete all chat history and templates? This action cannot be undone.') == true) {
      try {
        this.ss.deleteAll();
      } catch (error) {
        this.error = 'There was an error deleting the local storage. Please try again or delete it manually.'
        console.error('Error deleting local storage:', error);
        this.loadingDelete = false;
      }
    }
    this.loadingDelete = false;
  }

}
