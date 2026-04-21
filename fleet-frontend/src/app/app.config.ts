import { ApplicationConfig, APP_INITIALIZER, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeHr from '@angular/common/locales/hr';
import localeEn from '@angular/common/locales/en';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { languageInterceptor } from './core/interceptors/language.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { LanguageService } from './core/services/language.service';
import { LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';
import {
  LayoutDashboard, ChartBar, Car, UserRound, Link, Wrench, Fuel, MapPin,
  Shield, Clipboard, Search, TriangleAlert, Siren, Users, LogOut,
  Eye, EyeOff, Pencil, Trash2, Lock, Check, X, CreditCard,
  CalendarDays, ClipboardList, ChevronLeft, ChevronRight, Globe,
} from 'lucide-angular';

registerLocaleData(localeHr);
registerLocaleData(localeEn);

function detectLocale(): string {
  const seg = window.location.pathname.split('/').filter(Boolean)[0];
  return seg === 'en' ? 'en' : 'hr';
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor, languageInterceptor, errorInterceptor])),
    { provide: LOCALE_ID, useFactory: detectLocale },
    {
      provide: APP_INITIALIZER,
      useFactory: (lang: LanguageService) => () => lang.applyStoredPreference(),
      deps: [LanguageService],
      multi: true,
    },
    {
      provide: LUCIDE_ICONS,
      multi: true,
      useValue: new LucideIconProvider({
        LayoutDashboard, ChartBar, Car, UserRound, Link, Wrench, Fuel, MapPin,
        Shield, Clipboard, Search, TriangleAlert, Siren, Users, LogOut,
        Eye, EyeOff, Pencil, Trash2, Lock, Check, X, CreditCard,
        CalendarDays, ClipboardList, ChevronLeft, ChevronRight, Globe,
      }),
    },
  ]
};