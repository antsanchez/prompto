import { Component, ElementRef, ViewChild } from '@angular/core';
import { LcService } from '../../services/lc.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HelpersService } from '../../services/helpers.service';

@Component({
  selector: 'app-notebook',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './notebook.component.html',
  styleUrl: './notebook.component.css'
})
export class NotebookComponent {

  public loading: boolean = false;
  public prompt: string = "";
  public output: string = "";

  constructor(
    public lcService: LcService,
    public helpers: HelpersService,
  ) { }

  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    this.myScrollContainer.nativeElement.scrollIntoView();
  }

  async invoke() {
    this.loading = true;
    this.output = "";
    let stream = await this.lcService.stream(this.prompt);
    for await (let chunk of stream) {
      this.output += chunk;
    }
    this.loading = false;
  }

}
