import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HelpersService } from '../../services/helpers.service';
import { TemplatesService } from '../../services/templates.service';
import { ActivatedRoute } from '@angular/router';
import { ErrorComponent } from '../../components/error/error.component';

@Component({
  selector: 'app-template',
  standalone: true,
  imports: [FormsModule, CommonModule, ErrorComponent],
  templateUrl: './template.component.html',
  styleUrl: './template.component.css'
})
export class TemplateComponent {

  public loading: boolean = false;
  public loadingSave: boolean = false;
  public openSave: boolean = false;
  public error: string = "";

  constructor(
    public helpers: HelpersService,
    public templateService: TemplatesService,
    private activatedRoute: ActivatedRoute
  ) {
    this.templateService.new();
    this.loadTemplateFromURL();
  }

  loadTemplateFromURL() {
    let templateName = this.activatedRoute.snapshot.paramMap.get('template') || '';
    if (templateName) {
      this.templateService.loadTemplate(templateName);
    }
  }

  async stream() {
    this.loading = true;
    this.templateService.stream().then(() => {
      this.loading = false;
    }, (error) => {
      this.error = 'There was an error streaming the template. Please make sure your settings are correct and try again.'
      console.error('Error streaming the template:', error);
      this.loading = false;
    }
    );
  }

  save() {
    this.loadingSave = true;
    this.templateService.save();
    this.loadingSave = false;
    this.openSave = false;
  }

  new() {
    this.templateService.new();
  }
}
