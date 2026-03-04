import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn() || auth.isTokenExpired()) {
    auth.logout();
    return router.createUrlTree(['/login']);
  }
  if (auth.user()?.mustChangePassword) {
    return router.createUrlTree(['/change-password']);
  }
  return true;
};

// Role-based guard factory
export const roleGuard = (...roles: string[]): CanActivateFn => () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (!auth.hasRole(...roles as any)) {
    return router.createUrlTree(['/dashboard']);
  }
  return true;
};