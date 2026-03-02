/*!
 * SearchKit Widget v1.0.0
 * Vanilla JS search widget with Cmd+K trigger, keyboard nav, debounced search
 * Target: <5KB gzipped
 */

interface SearchKitConfig {
  apiKey: string;
  indexId: string;
  apiUrl?: string;
  placeholder?: string;
  maxResults?: number;
  onSelect?: (hit: SearchHit) => void;
}

interface SearchHit {
  id: string;
  content: Record<string, unknown>;
  _score: number;
  _highlight: string;
}

interface SearchResponse {
  hits: SearchHit[];
  total: number;
  took_ms: number;
  query: string;
}

class SearchKitWidget {
  private config: SearchKitConfig;
  private modal: HTMLElement | null = null;
  private input: HTMLInputElement | null = null;
  private results: HTMLElement | null = null;
  private overlay: HTMLElement | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private hits: SearchHit[] = [];
  private selectedIndex = -1;
  private isOpen = false;

  constructor(config: SearchKitConfig) {
    this.config = {
      apiUrl: '',
      placeholder: 'Search...',
      maxResults: 10,
      ...config,
    };
    this.init();
  }

  private init(): void {
    this.injectStyles();
    this.createModal();
    this.bindGlobalEvents();
    this.bindTriggerButtons();
  }

  private injectStyles(): void {
    if (document.getElementById('sk-styles')) return;
    const style = document.createElement('style');
    style.id = 'sk-styles';
    style.textContent = `
      #sk-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9998;display:flex;align-items:flex-start;justify-content:center;padding-top:15vh}
      #sk-modal{background:#1a1a2e;border:1px solid #2d2d4e;border-radius:12px;width:100%;max-width:560px;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,.5)}
      #sk-input-wrap{display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid #2d2d4e}
      #sk-search-icon{color:#666;flex-shrink:0}
      #sk-input{flex:1;background:none;border:none;outline:none;color:#fff;font-size:16px;font-family:inherit}
      #sk-input::placeholder{color:#555}
      #sk-kbd{font-size:11px;color:#555;background:#2d2d4e;border-radius:4px;padding:2px 6px;flex-shrink:0}
      #sk-results{max-height:380px;overflow-y:auto}
      .sk-result{display:block;padding:12px 16px;cursor:pointer;border-bottom:1px solid #1e1e3a;transition:background .1s}
      .sk-result:hover,.sk-result.active{background:#252545}
      .sk-result-title{font-weight:600;color:#e0e0ff;font-size:14px;margin-bottom:2px}
      .sk-result-snippet{font-size:12px;color:#888;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
      .sk-result-snippet b{color:#a78bfa}
      #sk-empty{padding:24px;text-align:center;color:#555;font-size:14px}
      #sk-footer{padding:8px 16px;display:flex;justify-content:flex-end;border-top:1px solid #2d2d4e}
      #sk-brand{font-size:11px;color:#444}
      #sk-brand span{color:#7c3aed}
    `;
    document.head.appendChild(style);
  }

  private createModal(): void {
    this.overlay = document.createElement('div');
    this.overlay.id = 'sk-overlay';
    this.overlay.style.display = 'none';

    const modal = document.createElement('div');
    modal.id = 'sk-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Search');

    const inputWrap = document.createElement('div');
    inputWrap.id = 'sk-input-wrap';

    const icon = document.createElement('span');
    icon.id = 'sk-search-icon';
    icon.innerHTML = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`;

    this.input = document.createElement('input');
    this.input.id = 'sk-input';
    this.input.type = 'search';
    this.input.placeholder = this.config.placeholder!;
    this.input.setAttribute('autocomplete', 'off');
    this.input.setAttribute('spellcheck', 'false');

    const kbd = document.createElement('span');
    kbd.id = 'sk-kbd';
    kbd.textContent = 'ESC';

    inputWrap.append(icon, this.input, kbd);

    this.results = document.createElement('div');
    this.results.id = 'sk-results';

    const footer = document.createElement('div');
    footer.id = 'sk-footer';
    footer.innerHTML = `<span id="sk-brand">Powered by <span>SearchKit</span></span>`;

    modal.append(inputWrap, this.results, footer);
    this.overlay.appendChild(modal);
    document.body.appendChild(this.overlay);
    this.modal = modal;

    // Close on overlay click
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    // Input events
    this.input.addEventListener('input', () => this.onInput());
    this.input.addEventListener('keydown', (e) => this.onKeyDown(e));
  }

  private bindGlobalEvents(): void {
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        this.isOpen ? this.close() : this.open();
      }
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  private bindTriggerButtons(): void {
    document.querySelectorAll('[data-searchkit-trigger]').forEach((el) => {
      el.addEventListener('click', () => this.open());
    });
  }

  open(): void {
    if (this.overlay) this.overlay.style.display = 'flex';
    this.isOpen = true;
    setTimeout(() => this.input?.focus(), 50);
  }

  close(): void {
    if (this.overlay) this.overlay.style.display = 'none';
    this.isOpen = false;
    this.hits = [];
    this.selectedIndex = -1;
    if (this.input) this.input.value = '';
    if (this.results) this.results.innerHTML = '';
  }

  private onInput(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      const q = this.input?.value.trim() ?? '';
      if (q.length > 0) {
        void this.search(q);
      } else {
        if (this.results) this.results.innerHTML = '';
        this.hits = [];
        this.selectedIndex = -1;
      }
    }, 300);
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.selectedIndex = Math.min(this.selectedIndex + 1, this.hits.length - 1);
      this.renderResults();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
      this.renderResults();
    } else if (e.key === 'Enter' && this.selectedIndex >= 0) {
      e.preventDefault();
      const hit = this.hits[this.selectedIndex];
      if (hit) this.selectHit(hit);
    }
  }

  private async search(q: string): Promise<void> {
    try {
      const apiUrl = this.config.apiUrl || window.location.origin;
      const res = await fetch(`${apiUrl}/api/v1/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          q,
          index_id: this.config.indexId,
          limit: this.config.maxResults,
          highlight: true,
        }),
      });

      if (!res.ok) return;
      const data: SearchResponse = await res.json();
      this.hits = data.hits;
      this.selectedIndex = -1;
      this.renderResults();
    } catch {
      // Silently fail
    }
  }

  private renderResults(): void {
    if (!this.results) return;
    this.results.innerHTML = '';

    if (this.hits.length === 0) {
      const empty = document.createElement('div');
      empty.id = 'sk-empty';
      empty.textContent = 'No results found';
      this.results.appendChild(empty);
      return;
    }

    this.hits.forEach((hit, i) => {
      const el = document.createElement('div');
      el.className = 'sk-result' + (i === this.selectedIndex ? ' active' : '');
      el.setAttribute('role', 'option');

      const title = document.createElement('div');
      title.className = 'sk-result-title';
      const content = hit.content as Record<string, unknown>;
      title.textContent = String(content.title ?? content.name ?? hit.id);

      const snippet = document.createElement('div');
      snippet.className = 'sk-result-snippet';
      snippet.innerHTML = hit._highlight || String(content.description ?? content.body ?? '').slice(0, 120);

      el.append(title, snippet);
      el.addEventListener('click', () => this.selectHit(hit));
      el.addEventListener('mouseenter', () => {
        this.selectedIndex = i;
        this.renderResults();
      });

      this.results!.appendChild(el);
    });
  }

  private selectHit(hit: SearchHit): void {
    if (this.config.onSelect) {
      this.config.onSelect(hit);
    } else {
      const content = hit.content as Record<string, unknown>;
      const url = String(content.url ?? content.link ?? '');
      if (url) window.location.href = url;
    }
    this.close();
  }
}

// Auto-init from script tag attributes
function autoInit(): void {
  const scripts = document.querySelectorAll<HTMLScriptElement>('script[data-api-key]');
  scripts.forEach((script) => {
    const apiKey = script.getAttribute('data-api-key');
    const indexId = script.getAttribute('data-index-id');
    const apiUrl = script.getAttribute('data-api-url') ?? '';
    const placeholder = script.getAttribute('data-placeholder') ?? 'Search...';

    if (apiKey && indexId) {
      new SearchKitWidget({ apiKey, indexId, apiUrl, placeholder });
    }
  });
}

// ESM export
export { SearchKitWidget };
export type { SearchKitConfig, SearchHit };

// UMD / browser global
if (typeof window !== 'undefined') {
  (window as Record<string, unknown>).SearchKit = { SearchKitWidget };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }
}
