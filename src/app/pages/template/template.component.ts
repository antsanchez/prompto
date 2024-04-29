import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HelpersService } from '../../services/helpers.service';
import { TemplatesService } from '../../services/templates.service';

@Component({
  selector: 'app-template',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './template.component.html',
  styleUrl: './template.component.css'
})
export class TemplateComponent {

  public loading: boolean = false;
  public loadingSave: boolean = false;
  public openSave: boolean = false;

  constructor(
    public helpers: HelpersService,
    public templateService: TemplatesService
  ) { }

  async stream() {
    this.loading = true;
    this.templateService.stream().then(() => {
      this.loading = false;
    });
  }

  save() {
    this.loadingSave = true;
    this.templateService.save();
    this.loadingSave = false;
    this.openSave = false;
  }
}
