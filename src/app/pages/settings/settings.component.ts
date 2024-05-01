import { Component } from '@angular/core';
import { LcService, Options } from '../../services/lc.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ErrorComponent } from '../../components/error/error.component';
import { ChatService } from '../../services/chat.service';
import { TemplatesService } from '../../services/templates.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule, CommonModule, ErrorComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent {

  public loading = false;
  public loadingDelete = false;
  public options: Options = {} as Options;
  public error: string = '';

  constructor(
    public lc: LcService,
    private chatService: ChatService,
    private templatesService: TemplatesService
  ) {
    try {
      this.lc.loadSettings();
    } catch (error) {
      this.error = 'There was an error loading the settings. Please try again.'
      console.error('Error loading settings:', error);
      return;
    }

    try {
      this.lc.createLLM();
    } catch (error) {
      this.error = 'There was an error creating the LLM. Please try again.'
      console.error('Error creating LLM:', error);
      return;
    }

    this.options = this.lc.getOptions();
    this.lc.getModels(this.options.provider);
  }

  async providerChanged(provider: any) {
    this.options = this.lc.getOptionsFromProvider(provider);
    this.lc.getModels(provider).then(() => {
      this.options.availableModels = this.lc.getAvailableModels(provider);
    }, (error) => {
      this.error = 'There was an error getting the models. Please make sure all settings are correct and try again.'
      console.error('Error getting models:', error);
    }
    )
  }

  async addedApiKey(apiKey: string) {
    this.lc.setApiKeyTemporarily(this.lc.getProvider(), apiKey)
    this.lc.getModels(this.options.provider).then(() => {
      this.options.availableModels = this.lc.getAvailableModels(this.options.provider);
    }, (error) => {
      this.error = 'There was an error getting the models. Please make sure all settings are correct and try again.'
      console.error('Error getting models:', error);
    }
    )
  }

  save() {
    this.loading = true;
    this.lc.setOptions(this.options);
    this.loading = false;
  }

  deleteAllLocalStorage() {
    this.loadingDelete = true;
    if (confirm('Are you sure you want to delete all chat history and templates? This action cannot be undone.') == true) {
      try {
        this.lc.clearOptions();
        this.chatService.deleteAll();
        this.templatesService.deleteAll();
        this.options = this.lc.getOptions();
      } catch (error) {
        this.error = 'There was an error deleting the local storage. Please try again or delete it manually.'
        console.error('Error deleting local storage:', error);
        this.loadingDelete = false;
      }
    }
    this.loadingDelete = false;
  }

}
