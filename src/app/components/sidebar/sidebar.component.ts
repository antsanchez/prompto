import { Component, Input, Output } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ChatKeys } from '../../services/chat.service';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../services/chat.service';
import { System, TemplatesService } from '../../services/templates.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {

  @Input() chats: ChatKeys[] = [] as ChatKeys[];
  @Input() templates: System[] = [] as System[];
  @Input() sidebarOpen: boolean = true;

  constructor(
    private router: Router,
    public activatedRoute: ActivatedRoute,
    private chatService: ChatService,
    public templatesService: TemplatesService
  ) { }

  closeSidebar() {
    this.sidebarOpen = false;
  }

  // Navigates to the /conversation route and loads the chat
  selectChat(chat: ChatKeys) {
    this.router.navigate(['/conversation', chat.key]);
    this.chatService.loadChat(chat.key);
  }

  // Deletes a chat from the chat list
  deleteChat(chat: ChatKeys) {
    this.chatService.deleteChat(chat.key);
    this.router.navigate(['/conversation', '']);
  }

  // Navigate to the /template route and load the template
  selectTemplate(template: System) {
    this.router.navigate(['/templates', template.name]);
    this.templatesService.loadTemplate(template.name);
  }

  // Deletes a template from the template list
  deleteTemplate(template: System) {
    this.templatesService.deleteTemplate(template.name);
    this.router.navigate(['/templates', '']);
  }

  // Pipe for shorting the name to 20 characters and adding ellipsis
  shortName(name: string) {
    if (name === undefined) {
      return "";
    }
    return name.length > 20 ? name.substring(0, 20) + "..." : name;
  }

  // Checks if the app is on the /conversation route and if the chat key matches the current key
  isChatSelected(key: string) {
    return this.router.url.includes("/conversation") && this.chatService.currentKey === key;
  }

  isTemplateSelected(name: string) {
    return this.router.url.includes("/templates") && this.templatesService.name === name;
  }
}
