import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { LanguageService } from '../services/language.service';

export const languageInterceptor: HttpInterceptorFn = (req, next) => {
  const lang = inject(LanguageService).currentLocale();
  const langReq = req.clone({ setHeaders: { 'Accept-Language': lang } });
  return next(langReq);
};
