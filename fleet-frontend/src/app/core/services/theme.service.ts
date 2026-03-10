import { Injectable, signal } from '@angular/core';

export interface ThemeDefinition {
  key: string;
  label: string;
  /** Three preview swatches: [brand, sidebar, page-bg] */
  preview: [string, string, string];
  vars: Record<string, string>;
}

const STORAGE_KEY = 'fleet_theme';

export const THEMES: ThemeDefinition[] = [
  {
    key: 'light',
    label: 'Light',
    preview: ['#2563eb', '#0f172a', '#f8fafc'],
    vars: {
      '--brand':               '#2563eb',
      '--brand-dark':          '#1d4ed8',
      '--brand-subtle':        '#eff6ff',
      '--sidebar-bg':          '#0f172a',
      '--sidebar-border':      'rgba(255,255,255,0.07)',
      '--sidebar-text':        '#f8fafc',
      '--sidebar-text-muted':  '#94a3b8',
      '--sidebar-muted':       '#64748b',
      '--sidebar-hover':       'rgba(255,255,255,0.06)',
      '--page-bg':             '#f8fafc',
      '--text-primary':        '#0f172a',
      '--text-secondary':      '#374151',
      '--text-muted':          '#6b7280',
      '--border':              '#e2e8f0',
      '--card-bg':             '#ffffff',
      '--input-bg':            '#ffffff',
      '--topbar-bg':           '#ffffff',
      '--hover-bg':            '#f8fafc',
      '--subtle-bg':           '#f8fafc',
      '--row-danger-bg':       '#fef2f2',
      '--row-warn-bg':         '#fffbeb',
      '--row-danger-highlight':'#fef2f2',
    },
  },
  {
    key: 'dark',
    label: 'Dark',
    preview: ['#6366f1', '#0a0a0f', '#13131a'],
    vars: {
      '--brand':               '#6366f1',
      '--brand-dark':          '#4f46e5',
      '--brand-subtle':        'rgba(99,102,241,0.15)',
      '--sidebar-bg':          '#0a0a0f',
      '--sidebar-border':      'rgba(255,255,255,0.06)',
      '--sidebar-text':        '#e2e8f0',
      '--sidebar-text-muted':  '#64748b',
      '--sidebar-muted':       '#475569',
      '--sidebar-hover':       'rgba(255,255,255,0.05)',
      '--page-bg':             '#13131a',
      '--text-primary':        '#e2e8f0',
      '--text-secondary':      '#94a3b8',
      '--text-muted':          '#64748b',
      '--border':              '#2a2a3e',
      '--card-bg':             '#1a1a27',
      '--input-bg':            '#20202f',
      '--topbar-bg':           '#16161f',
      '--hover-bg':            '#22223a',
      '--subtle-bg':           '#1e1e2e',
      '--row-danger-bg':       '#2d1a1a',
      '--row-warn-bg':         '#2a2010',
      '--row-danger-highlight':'#2d1a1a',
    },
  },
  {
    key: 'ocean',
    label: 'Ocean',
    preview: ['#0891b2', '#0c4a6e', '#f0f9ff'],
    vars: {
      '--brand':               '#0891b2',
      '--brand-dark':          '#0e7490',
      '--brand-subtle':        '#e0f2fe',
      '--sidebar-bg':          '#0c4a6e',
      '--sidebar-border':      'rgba(255,255,255,0.08)',
      '--sidebar-text':        '#f0f9ff',
      '--sidebar-text-muted':  '#7dd3fc',
      '--sidebar-muted':       '#38bdf8',
      '--sidebar-hover':       'rgba(255,255,255,0.07)',
      '--page-bg':             '#f0f9ff',
      '--text-primary':        '#0c4a6e',
      '--text-secondary':      '#164e63',
      '--text-muted':          '#0369a1',
      '--border':              '#bae6fd',
      '--card-bg':             '#ffffff',
      '--input-bg':            '#ffffff',
      '--topbar-bg':           '#ffffff',
      '--hover-bg':            '#e0f2fe',
      '--subtle-bg':           '#f0f9ff',
      '--row-danger-bg':       '#fee2e2',
      '--row-warn-bg':         '#fef9c3',
      '--row-danger-highlight':'#fee2e2',
    },
  },
  {
    key: 'slate-steel',
    label: 'Slate Steel',
    preview: ['#475569', '#1e293b', '#f1f5f9'],
    vars: {
      '--brand':               '#475569',
      '--brand-dark':          '#334155',
      '--brand-subtle':        '#f1f5f9',
      '--sidebar-bg':          '#1e293b',
      '--sidebar-border':      'rgba(255,255,255,0.06)',
      '--sidebar-text':        '#f1f5f9',
      '--sidebar-text-muted':  '#94a3b8',
      '--sidebar-muted':       '#64748b',
      '--sidebar-hover':       'rgba(255,255,255,0.05)',
      '--page-bg':             '#f1f5f9',
      '--text-primary':        '#0f172a',
      '--text-secondary':      '#1e293b',
      '--text-muted':          '#64748b',
      '--border':              '#cbd5e1',
      '--card-bg':             '#ffffff',
      '--input-bg':            '#ffffff',
      '--topbar-bg':           '#ffffff',
      '--hover-bg':            '#f1f5f9',
      '--subtle-bg':           '#f8fafc',
      '--row-danger-bg':       '#fef2f2',
      '--row-warn-bg':         '#fffbeb',
      '--row-danger-highlight':'#fef2f2',
    },
  },
];

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly themes = THEMES;
  readonly activeTheme = signal<string>('light');

  constructor() {
    this.initTheme();
  }

  initTheme(): void {
    const saved = localStorage.getItem(STORAGE_KEY) ?? 'light';
    this.setTheme(saved);
  }

  setTheme(key: string): void {
    const theme = THEMES.find(t => t.key === key) ?? THEMES[0];
    localStorage.setItem(STORAGE_KEY, theme.key);
    const root = document.documentElement;
    for (const [prop, value] of Object.entries(theme.vars)) {
      root.style.setProperty(prop, value);
    }
    this.activeTheme.set(theme.key);
  }
}
