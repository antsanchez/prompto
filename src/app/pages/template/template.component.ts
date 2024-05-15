import { Component, OnDestroy } from '@angular/core';
import { HelpersService } from '../../services/helpers.service';
import { TemplatesService } from '../../services/templates.service';
import { ActivatedRoute } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-template',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './template.component.html',
  styleUrls: ['./template.component.css']  // Note: Fixed 'styleUrl' to 'styleUrls' for array usage
})
export class TemplateComponent implements OnDestroy {

  public loading: boolean = false;
  public loadingSave: boolean = false;
  public openSave: boolean = false;
  public error: string = "";
  public showInfo: boolean = false;
  private destroy$ = new Subject<void>();

  constructor(
    public helpers: HelpersService,
    public templateService: TemplatesService,
    private activatedRoute: ActivatedRoute
  ) {
    this.initTemplate();
    this.subscribeToRouteParams();
  }

  private async initTemplate() {
    try {
      await this.templateService.new();
      this.templateService.setConnected(true);
    } catch (error) {
      this.errorHandling('Error creating a new template:', error);
      this.templateService.setConnected(false);
    }
  }

  private subscribeToRouteParams() {
    this.activatedRoute.paramMap.pipe(takeUntil(this.destroy$)).subscribe({
      next: (params) => {
        const templateName = params.get('template') || '';
        if (templateName) {
          this.templateService.loadTemplate(templateName);
        } else {
          this.templateService.new();
        }
      },
      error: (error) => this.errorHandling('Error loading template from URL:', error)
    });
  }


  async stream() {
    this.loading = true;
    try {
      await this.templateService.stream();
    } catch (error) {
      this.errorHandling('Error streaming the template:', error);
    } finally {
      this.loading = false;
    }
  }

  save() {
    this.loadingSave = true;
    try {
      this.templateService.save();
    } catch (error) {
      this.errorHandling('Error saving the template:', error);
    } finally {
      this.loadingSave = false;
      this.openSave = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private errorHandling(message: string, error: any): void {
    console.error(message, error);
    this.error = 'There was an error with your request. Please check your connection and settings and try again.';
  }
}
