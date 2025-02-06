import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ThemeService {
    private darkMode = new BehaviorSubject<boolean>(false);
    darkMode$ = this.darkMode.asObservable();

    constructor() {
        // Check if user previously selected dark mode
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            this.enableDarkMode();
        }
    }

    toggleDarkMode(): void {
        if (document.documentElement.classList.contains('dark')) {
            this.disableDarkMode();
        } else {
            this.enableDarkMode();
        }
    }

    private enableDarkMode(): void {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
        this.darkMode.next(true);
    }

    private disableDarkMode(): void {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        this.darkMode.next(false);
    }
}
