import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NotConnectedComponent } from '../../components/not-connected/not-connected.component';
import { LcService } from '../../services/lc.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, NotConnectedComponent, CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {

  constructor(public lc: LcService) {
    let options = this.lc.getOptions();
    this.lc.getModels(options.provider);
  }

}
