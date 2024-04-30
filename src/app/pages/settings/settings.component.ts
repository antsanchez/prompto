import { Component } from '@angular/core';
import { LcService, Options } from '../../services/lc.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent {

  public loading = false;
  public options: Options = {} as Options;

  constructor(
    public lc: LcService,
  ) {
    this.lc.loadSettings();
    this.options = this.lc.getOptions();
    this.lc.getModels(this.options.provider);
  }

  async providerChanged(provider: any) {
    this.options = this.lc.getOptionsFromProvider(provider);
    await this.lc.getModels(provider);
    this.options.availableModels = this.lc.getAvailableModels(provider);
  }

  async addedApiKey(apiKey: string) {
    this.lc.setApiKeyTemporarily(this.lc.getProvider(), apiKey)
    await this.lc.getModels(this.options.provider);
    this.options.availableModels = this.lc.getAvailableModels(this.options.provider);
  }


  save() {
    this.loading = true;
    this.lc.setOptions(this.options);
    this.loading = false;
  }

}
