import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';
import {
  LayoutDashboard, ChartBar, Car, UserRound, Link, Wrench, Fuel, MapPin,
  Shield, Clipboard, Search, TriangleAlert, Siren, Users, LogOut,
  Eye, EyeOff, Pencil, Trash2, Lock, Check, X, CreditCard,
  CalendarDays, ClipboardList, ChevronLeft, ChevronRight,
} from 'lucide-angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    {
      provide: LUCIDE_ICONS,
      multi: true,
      useValue: new LucideIconProvider({
        LayoutDashboard, ChartBar, Car, UserRound, Link, Wrench, Fuel, MapPin,
        Shield, Clipboard, Search, TriangleAlert, Siren, Users, LogOut,
        Eye, EyeOff, Pencil, Trash2, Lock, Check, X, CreditCard,
        CalendarDays, ClipboardList, ChevronLeft, ChevronRight,
      }),
    },
  ]
};