import { Component, Input, Output } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ChatKeys, LcService } from '../../services/lc.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {

  @Input() chats: ChatKeys[] = [] as ChatKeys[];

  constructor(
    private router: Router,
    private lcService: LcService
  ) { }

  selectChat(chat: ChatKeys) {
    this.router.navigate(['/conversation', chat.key]);
    this.lcService.loadChat(chat.key);
  }

  deleteChat(chat: ChatKeys) {
    this.lcService.deleteChat(chat.key);
    this.router.navigate(['/conversation', '']);
  }

  // Pipe for shorting the name to 20 characters and adding ellipsis
  shortName(name: string) {
    if (name === undefined) {
      return "";
    }
    return name.length > 20 ? name.substring(0, 20) + "..." : name;
  }
}
