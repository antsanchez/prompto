import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { STORAGE_KEYS } from '../core/constants';

@Injectable({
    providedIn: 'root'
})
export class ThemeService {
    private darkMode = new BehaviorSubject<boolean>(false);
    darkMode$ = this.darkMode.asObservable();

    constructor() {
        // Check if user previously selected dark mode
        const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
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
        localStorage.setItem(STORAGE_KEYS.THEME, 'dark');
        this.darkMode.next(true);
    }

    private disableDarkMode(): void {
        document.documentElement.classList.remove('dark');
        localStorage.setItem(STORAGE_KEYS.THEME, 'light');
        this.darkMode.next(false);
    }
}
