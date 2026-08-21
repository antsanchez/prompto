import { CommonModule } from '@angular/common';
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-error',
    imports: [CommonModule],
    templateUrl: './error.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './error.component.css'
})
export class ErrorComponent {

  @Input('error') errorMsg: string = '';

  public close(): void {
    this.errorMsg = '';
  }
}
