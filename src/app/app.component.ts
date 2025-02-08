import { Component } from '@angular/core';
import { NavigationEnd, RouterOutlet } from '@angular/router';
import { Router, ActivatedRoute } from '@angular/router';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { SettingsService } from './services/settings.service';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    SidebarComponent,
    RouterOutlet,
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
    public ss: SettingsService,
  ) {
    try {
      this.ss.loadSettings();
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  openSidebar() {
    this.isSidebarVisible = true;
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

    this.ss.loadKeys()
    this.ss.loadTemplates()
  }

  // Show the title of the page
  showTitle(title: string): string {
    if (this.router.url === '/arena') {
      return 'Arena';
    }
    let provider = this.ss.getProvider() || 'No LLM selected';
    let model = this.ss.getModel() || 'No model selected';
    return `${title} | ${provider} (${model}) | Temperature: ${this.ss.getTemperature()}`;
  }

}
