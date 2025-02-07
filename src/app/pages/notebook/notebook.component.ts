import { Component, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { LcService } from '../../services/lc.service';
import { HelpersService } from '../../services/helpers.service';
import { SharedModule } from '../../shared/shared.module';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-notebook',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './notebook.component.html',
  styleUrls: ['./notebook.component.css']  // Fixed: 'styleUrl' to 'styleUrls' and array usage
})
export class NotebookComponent implements OnDestroy {
  public loading: boolean = false;
  public prompt: string = "";
  public output: string = "";
  public error: string = "";

  private destroy$ = new Subject<void>();

  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;

  constructor(
    public lc: LcService,
    public helpers: HelpersService
  ) {
    this.lc.s.checkConnection();
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  new() {
    this.resetNotebook();

    try {
      this.lc.s.loadSettings();
    } catch (error) {
      this.handleError('Error loading settings:', error);
      return;
    }

    this.createLLM();
  }

  private async createLLM() {
    try {
      const llm = await this.lc.createLLM(this.lc.s.getProvider());
      this.lc.llm = llm;
      this.lc.s.setConnected(true);
    } catch (error) {
      this.handleError('Error creating LLM:', error);
      this.lc.s.setConnected(false);
    }
  }

  private resetNotebook() {
    this.prompt = "";
    this.output = "";
    this.error = "";
    this.loading = false;
  }

  scrollToBottom(): void {
    this.myScrollContainer.nativeElement.scrollIntoView({ behavior: 'smooth' });
  }

  async invoke() {
    this.loading = true;
    this.output = "";
    try {
      const stream = await this.lc.stream(this.prompt);
      for await (let chunk of stream) {
        this.output += chunk?.content;
      }
    } catch (error) {
      this.handleError('Error invoking the model:', error);
      this.lc.s.setConnected(false);
    } finally {
      this.loading = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private handleError(message: string, error: any): void {
    console.error(message, error);
    this.error = 'There was an error with your request. Please check your connection and settings and try again.';
  }
}
