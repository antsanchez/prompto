import { Component } from '@angular/core';
import { NavigationEnd, NavigationStart, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Router, ActivatedRoute } from '@angular/router';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { Title } from '@angular/platform-browser';
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
    public lcService: LcService
  ) { }

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

    this.lcService.loadChatNames()
  }
}
