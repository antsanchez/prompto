import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ErrorComponent } from '../components/error/error.component';
import { NotConnectedComponent } from '../components/not-connected/not-connected.component';
import { MessageDisplayComponent } from '../components/message-display/message-display.component';

@NgModule({
    declarations: [
    ],
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        ErrorComponent,
        NotConnectedComponent,
        MessageDisplayComponent
    ],
    exports: [
        CommonModule,
        FormsModule,
        RouterModule,
        ErrorComponent,
        NotConnectedComponent,
        MessageDisplayComponent
    ]
})
export class SharedModule { }
