import { Component } from '@angular/core';
import { NavigationEnd, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Router, ActivatedRoute } from '@angular/router';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { ChatService } from './services/chat.service';
import { TemplatesService } from './services/templates.service';
import { LcService } from './services/lc.service';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    SidebarComponent,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'Prompto App';

  isSidebarVisible = false;

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    public chatService: ChatService,
    public templateService: TemplatesService,
    public lc: LcService,
  ) {
    try {
      this.lc.loadSettings();
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  toggleSidebar() {
    this.isSidebarVisible = !this.isSidebarVisible;
  }

  // Detect every time a route change occurs
  ngOnInit() {
    let self = this;
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        let route = this.activatedRoute;
        while (route.firstChild) route = route.firstChild;
        route.data.subscribe(data => {
          self.title = data['title'];
        });
      }
    });

    this.chatService.loadChatNames()
    this.templateService.loadTemplates()
  }

}
