import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PagedRequest, PagedResponse } from '../models/paged.models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  protected base = environment.apiUrl;

  constructor(protected http: HttpClient) {}

  get<T>(path: string): Observable<T> {
    return this.http.get<T>(`${this.base}/${path}`);
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.base}/${path}`, body);
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(`${this.base}/${path}`, body);
  }

  patch<T>(path: string, body: unknown): Observable<T> {
    return this.http.patch<T>(`${this.base}/${path}`, body);
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.base}/${path}`);
  }

  protected buildPagedParams(request: PagedRequest, filter?: Record<string, any>): HttpParams {
    let params = new HttpParams();

    if (request.page) params = params.set('page', request.page.toString());
    if (request.pageSize) params = params.set('pageSize', request.pageSize.toString());
    if (request.search) params = params.set('search', request.search);
    if (request.sortBy) params = params.set('sortBy', request.sortBy);
    if (request.sortDirection) params = params.set('sortDirection', request.sortDirection);

    if (filter) {
      for (const [key, value] of Object.entries(filter)) {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(`filter.${key}`, value.toString());
        }
      }
    }

    return params;
  }

  getWithParams<T>(path: string, params: HttpParams): Observable<T> {
    return this.http.get<T>(`${this.base}/${path}`, { params });
  }

  downloadFile(path: string, params: HttpParams): Observable<Blob> {
    return this.http.get(`${this.base}/${path}`, {
      params,
      responseType: 'blob'
    });
  }
}
