import { Component } from '@angular/core';
import { LcService } from '../../services/lc.service';
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

  constructor(
    public lc: LcService,
  ) {
    this.lc.getOllamaModels();
  }

  providerChanged(provider: any) {
    if (provider === 'Ollama') {
      this.lc.getOllamaModels();
    }
  }

  save() {
    this.loading = true;
    this.lc.saveSettings();
    this.loading = false;
  }

}
