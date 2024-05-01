import { Component, ElementRef, ViewChild } from '@angular/core';
import { LcService } from '../../services/lc.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HelpersService } from '../../services/helpers.service';
import { ErrorComponent } from '../../components/error/error.component';

@Component({
  selector: 'app-notebook',
  standalone: true,
  imports: [FormsModule, CommonModule, ErrorComponent],
  templateUrl: './notebook.component.html',
  styleUrl: './notebook.component.css'
})
export class NotebookComponent {

  public loading: boolean = false;
  public prompt: string = "";
  public output: string = "";
  public error: string = "";

  constructor(
    public lcService: LcService,
    public helpers: HelpersService,
  ) { }

  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  new() {
    this.prompt = "";
    this.output = "";
    this.error = "";
    this.loading = false;

    try {
      this.lcService.loadSettings();
    } catch (error) {
      this.error = 'There was an error loading the settings. Please make sure your settings are correct and try again.';
      console.error('Error loading settings:', error);
      return;
    }

    try {
      this.lcService.createLLM();
    } catch (error) {
      this.error = 'There was an error creating the model. Please make sure your settings are correct and try again.';
      console.error('Error creating the model:', error);
      return;
    }
  }

  scrollToBottom(): void {
    this.myScrollContainer.nativeElement.scrollIntoView();
  }

  async invoke() {
    this.loading = true;
    this.output = "";
    try {
      let stream = await this.lcService.stream(this.prompt);
      for await (let chunk of stream) {
        this.output += chunk?.content;
      }
      this.loading = false;
    } catch (error) {
      this.error = 'There was an error invoking the model. Please make sure your settings are correct and try again.'
      console.error('Error invoking the model:', error);
      this.loading = false;
    }
  }

}
