import { Injectable, signal } from '@angular/core';

export type AppLocale = 'en' | 'hr';

const STORAGE_KEY = 'fleet_locale';
const SUPPORTED: AppLocale[] = ['en', 'hr'];
const DEFAULT: AppLocale = 'hr';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  readonly currentLocale = signal<AppLocale>(this.detectCurrent());

  private detectCurrent(): AppLocale {
    const seg = window.location.pathname.split('/').filter(Boolean)[0] as AppLocale;
    return SUPPORTED.includes(seg) ? seg : DEFAULT;
  }

  getStored(): AppLocale {
    const v = localStorage.getItem(STORAGE_KEY) as AppLocale;
    return SUPPORTED.includes(v) ? v : DEFAULT;
  }

  switchTo(locale: AppLocale): void {
    if (locale === this.currentLocale()) return;
    localStorage.setItem(STORAGE_KEY, locale);
    const newPath = window.location.pathname.replace(
      `/${this.currentLocale()}/`, `/${locale}/`
    );
    window.location.href = newPath + window.location.search + window.location.hash;
  }

  applyStoredPreference(): void {
    const stored = this.getStored();
    if (stored !== this.currentLocale()) this.switchTo(stored);
  }
}
