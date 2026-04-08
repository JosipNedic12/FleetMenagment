import {
  Component, signal, inject, HostListener, ElementRef, OnDestroy
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule, Search } from 'lucide-angular';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SearchApiService, SearchResult } from '../../../core/auth/feature-api.services';

type GroupedResults = { type: string; items: SearchResult[] }[];

@Component({
  selector: 'app-global-search',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  template: `
    <div class="search-wrapper" (click)="$event.stopPropagation()">
      <div class="search-input-row">
        <lucide-icon [img]="searchIcon" [size]="15" class="search-icon" [strokeWidth]="2"></lucide-icon>
        <input
          #inputEl
          class="search-input"
          i18n-placeholder="@@shared.globalSearch.placeholder"
          placeholder="Search vehicles, drivers, maintenance…"
          [(ngModel)]="query"
          (ngModelChange)="onQueryChange($event)"
          (focus)="onFocus()"
          (keydown.escape)="close()"
          autocomplete="off"
        />
        @if (loading()) {
          <span class="spinner"></span>
        }
      </div>

      @if (open() && (grouped().length > 0 || query.length >= 2)) {
        <div class="dropdown">
          @if (grouped().length === 0) {
            <div class="empty" i18n="@@shared.globalSearch.noResults">No results for "{{ query }}"</div>
          }
          @for (group of grouped(); track group.type) {
            <div class="group-label">{{ group.type }}s</div>
            @for (item of group.items; track item.id) {
              <button class="result-item" (click)="navigate(item)">
                <span class="result-title">{{ item.title }}</span>
                <span class="result-sub">{{ item.subtitle }}</span>
              </button>
            }
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .search-wrapper { position: relative; width: 340px; max-width: 100%; min-width: 0; }
    .search-input-row { display: flex; align-items: center; gap: 8px; background: var(--input-bg, #f8fafc); border: 1.5px solid var(--border, #e2e8f0); border-radius: 8px; padding: 0 12px; height: 36px; transition: border-color 0.15s; }
    .search-input-row:focus-within { border-color: var(--brand, #2563eb); background: var(--input-bg, #fff); }
    .search-icon { color: var(--text-muted, #94a3b8); flex-shrink: 0; }
    .search-input { flex: 1; border: none; background: transparent; outline: none; font-size: 13.5px; color: var(--text-primary, #0f172a); min-width: 0; }
    .search-input::placeholder { color: var(--text-muted, #94a3b8); }
    .spinner { width: 14px; height: 14px; border: 2px solid var(--border, #e2e8f0); border-top-color: var(--brand, #2563eb); border-radius: 50%; animation: spin 0.6s linear infinite; flex-shrink: 0; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .dropdown { position: absolute; top: calc(100% + 6px); left: 0; right: 0; width: auto; min-width: 280px; background: var(--card-bg, #fff); border: 1.5px solid var(--border, #e2e8f0); border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); z-index: 500; max-height: 380px; overflow-y: auto; padding: 6px 0; }
    .group-label { font-size: 10px; font-weight: 700; letter-spacing: 0.7px; text-transform: uppercase; color: var(--text-muted, #94a3b8); padding: 8px 14px 4px; }
    .result-item { display: flex; flex-direction: column; gap: 1px; width: 100%; text-align: left; padding: 7px 14px; background: none; border: none; cursor: pointer; transition: background 0.12s; }
    .result-item:hover { background: var(--brand-subtle, #eff6ff); }
    .result-title { font-size: 13.5px; font-weight: 600; color: var(--text-primary, #0f172a); }
    .result-sub { font-size: 12px; color: var(--text-muted, #94a3b8); }
    .empty { padding: 16px 14px; font-size: 13px; color: var(--text-muted, #94a3b8); }
  `]
})
export class GlobalSearchComponent implements OnDestroy {
  readonly searchIcon = Search;

  private searchApi = inject(SearchApiService);
  private router = inject(Router);
  private elRef = inject(ElementRef);

  query = '';
  open = signal(false);
  loading = signal(false);
  grouped = signal<GroupedResults>([]);

  private query$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor() {
    this.query$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(q => {
          if (q.length < 2) { this.loading.set(false); return of([]); }
          this.loading.set(true);
          return this.searchApi.search(q);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(results => {
        this.loading.set(false);
        this.grouped.set(this.group(results));
        this.open.set(true);
      });
  }

  onQueryChange(q: string) {
    if (q.length < 2) {
      this.grouped.set([]);
      this.open.set(false);
      this.loading.set(false);
    }
    this.query$.next(q);
  }

  onFocus() {
    if (this.grouped().length > 0) this.open.set(true);
  }

  navigate(item: SearchResult) {
    this.router.navigateByUrl(item.route);
    this.close();
  }

  close() {
    this.open.set(false);
    this.query = '';
    this.grouped.set([]);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent) {
    if (!this.elRef.nativeElement.contains(e.target)) this.close();
  }

  private group(results: SearchResult[]): GroupedResults {
    const map = new Map<string, SearchResult[]>();
    for (const r of results) {
      if (!map.has(r.type)) map.set(r.type, []);
      map.get(r.type)!.push(r);
    }
    return Array.from(map.entries()).map(([type, items]) => ({ type, items }));
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
