import { Component, EventEmitter, Input, Output, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { Keys, SettingsService, System } from '../../services/settings.service';
import { version } from '../../../../package.json';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit, OnDestroy {

  public version: string = version;

  @Input() sidebarOpen: boolean = true;
  @Output() sidebarOpenChange = new EventEmitter<boolean>();

  constructor(
    private router: Router,
    public activatedRoute: ActivatedRoute,
    public ss: SettingsService
  ) { }

  ngOnDestroy(): void { }

  ngOnInit() {
    // Load initial data
    this.ss.loadKeys();
  }

  closeSidebar() {
    this.sidebarOpen = false;
    this.sidebarOpenChange.emit(this.sidebarOpen);
  }

  // Navigates to the /conversation route and loads the chat
  selectChat(chat: Keys, close: boolean = false) {
    this.router.navigate(['/conversation', chat.key]);
    if (close) {
      this.closeSidebar();
    }
  }

  // Deletes a chat from the chat list
  deleteChat(chat: Keys) {
    this.ss.deleteChat(chat.key);
    this.router.navigate(['/conversation', '']);
  }

  // Navigate to the /arena route and load the arena
  selectArena(arena: Keys, close: boolean = false) {
    this.router.navigate(['/arena', arena.key]);
    if (close) {
      this.closeSidebar();
    }
  }

  // Deletes an arena from the arena list
  deleteArena(arena: Keys) {
    this.ss.deleteArena(arena.key);
    this.router.navigate(['/arena', ''])
  }

  // Navigate to the /template route and load the template
  selectTemplate(template: System, close: boolean = false) {
    this.router.navigate(['/templates', template.name]);
    if (close) {
      this.closeSidebar();
    }
  }

  // Deletes a template from the template list
  deleteTemplate(template: System) {
    this.ss.deleteTemplate(template.name);
    this.router.navigate(['/templates', '']);
  }

  // Navigate to the /discussion route and load the discussion
  selectDiscussion(discussion: Keys, close: boolean = false) {
    this.ss.currentDiscussionKey = discussion.key;  // Set current discussion key
    this.router.navigate(['/discussion', discussion.key]);
    if (close) {
      this.closeSidebar();
    }
  }

  // Deletes a discussion from the discussion list
  deleteDiscussion(discussion: Keys) {
    this.ss.deleteDiscussion(discussion.key);
    this.router.navigate(['/discussion', '']);
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
    return this.router.url.includes("/conversation") && this.ss.currentChatKey === key;
  }

  // Checks if the app is on the /templates route and if the template name matches the current name
  isTemplateSelected(name: string) {
    return this.router.url.includes("/templates") && this.ss.currentTemplateName === name;
  }

  // Checks if the app is on the /arena route and if the arena key matches the current key
  isArenaSelected(key: string) {
    return this.router.url.includes("/arena") && this.ss.currentArenaKey === key;
  }

  // Checks if the app is on the /discussion route and if the discussion key matches the current key
  isDiscussionSelected(key: string) {
    return this.router.url.includes("/discussion") && this.ss.currentDiscussionKey === key;
  }
}
