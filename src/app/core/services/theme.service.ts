import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type AppTheme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'bic_app_theme';
  private readonly themeSubject = new BehaviorSubject<AppTheme>(this.loadInitialTheme());
  readonly theme$ = this.themeSubject.asObservable();

  constructor() {
    this.applyTheme(this.themeSubject.value);
  }

  get current(): AppTheme {
    return this.themeSubject.value;
  }

  get isDark(): boolean {
    return this.themeSubject.value === 'dark';
  }

  toggle(): AppTheme {
    const next: AppTheme = this.isDark ? 'light' : 'dark';
    this.setTheme(next);
    return next;
  }

  setTheme(theme: AppTheme): void {
    this.themeSubject.next(theme);
    try {
      localStorage.setItem(this.storageKey, theme);
    } catch {
      // Ignore storage errors
    }
    this.applyTheme(theme);
  }

  private loadInitialTheme(): AppTheme {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {
      // Ignore
    }
    return 'dark';
  }

  private applyTheme(theme: AppTheme): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const body = document.body;
    root.setAttribute('data-theme', theme);
    root.classList.toggle('dark-theme', theme === 'dark');
    if (body) {
      body.setAttribute('data-theme', theme);
      body.classList.toggle('dark-theme', theme === 'dark');
    }
  }
}
