import { Component } from '@angular/core';
import { LcService } from '../../services/lc.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  ) { }

  async invoke() {
    this.loading = true;
    let stream = await this.lcService.stream(this.prompt);
    for await (let chunk of stream) {
      this.output += this.presentMessage(chunk);
    }
    this.loading = false;
  }

  // presentMessage converts the LLM output to HTML
  presentMessage(message: string) {
    return message
      .replace(/(?:\r\n|\r|\n)/g, '<br>')
      .replace(/(https?:\/\/[^\s]+)(?![\w/])/g, '<a href="$1" target="_blank">$1</a>');
  }
}
