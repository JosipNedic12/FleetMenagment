import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../../shared/components/toast/toast.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const apiMessage: string | undefined = err.error?.message;

      if (err.status === 0) {
        // Network error / server unreachable
        toast.error($localize`:@@ERROR.network:Nije moguće spojiti se na poslužitelj.`);
      } else if (err.status >= 500) {
        toast.error(apiMessage ?? $localize`:@@ERROR.unexpected:Došlo je do neočekivane pogreške.`);
      } else if (err.status === 409 || err.status === 422) {
        // Conflict / validation — bubble to component's formError, also show toast
        toast.error(apiMessage ?? $localize`:@@ERROR.conflict:Zahtjev nije moguće obraditi.`);
      } else if (err.status === 403) {
        toast.error($localize`:@@ERROR.forbidden:Nemate ovlasti za ovu radnju.`);
      } else if (err.status === 404) {
        // 404s on GET are handled by components — only toast for mutating verbs
        if (req.method !== 'GET') {
          toast.error(apiMessage ?? $localize`:@@ERROR.notFound:Zapis nije pronađen.`);
        }
      }
      // 401 is handled by authInterceptor (logout); re-throw for all cases
      return throwError(() => err);
    })
  );
};
