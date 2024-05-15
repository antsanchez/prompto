import { Component } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {

  constructor(public ss: SettingsService) {
    let options = this.ss.getOptions();
    this.ss.getModels(options.provider);
  }

}
