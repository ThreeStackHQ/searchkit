// SearchKit Widget — Cmd+K / Ctrl+K powered search overlay
// XSS-safe: no innerHTML with raw user data. All user input goes through escapeHtml.

declare global {
  interface Window {
    SearchKit: typeof SearchKit;
  }
}

interface SearchKitConfig {
  apiKey: string;
  indexId: string;
  endpoint: string;
}

interface SearchResult {
  docId: string;
  title: string;
  url?: string;
  snippet?: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const SearchKit = (() => {
  let config: SearchKitConfig | null = null;
  let modal: HTMLDivElement | null = null;
  let input: HTMLInputElement | null = null;
  let resultsList: HTMLUListElement | null = null;
  let results: SearchResult[] = [];
  let selectedIndex = -1;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let isOpen = false;

  // --- DOM helpers ---

  function createModal(): void {
    const overlay = document.createElement('div');
    overlay.id = 'searchkit-overlay';
    overlay.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:999999',
      'background:rgba(0,0,0,0.5)', 'display:flex',
      'align-items:flex-start', 'justify-content:center',
      'padding-top:10vh',
    ].join(';');

    const box = document.createElement('div');
    box.style.cssText = [
      'background:#1e293b', 'border-radius:12px', 'width:min(600px,90vw)',
      'box-shadow:0 25px 60px rgba(0,0,0,0.5)', 'overflow:hidden',
      'font-family:system-ui,sans-serif',
    ].join(';');

    // Search input
    const inputWrapper = document.createElement('div');
    inputWrapper.style.cssText = 'display:flex;align-items:center;padding:12px 16px;border-bottom:1px solid #334155';

    const icon = document.createElement('span');
    icon.textContent = '🔍';
    icon.style.cssText = 'margin-right:10px;font-size:16px;opacity:0.6';

    input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Search…';
    input.style.cssText = [
      'flex:1', 'background:transparent', 'border:none', 'outline:none',
      'color:#f1f5f9', 'font-size:16px', 'caret-color:#6366f1',
    ].join(';');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('spellcheck', 'false');

    const kbd = document.createElement('kbd');
    kbd.textContent = 'ESC';
    kbd.style.cssText = [
      'font-size:11px', 'color:#64748b', 'background:#0f172a',
      'border:1px solid #334155', 'border-radius:4px', 'padding:2px 6px',
    ].join(';');

    inputWrapper.appendChild(icon);
    inputWrapper.appendChild(input);
    inputWrapper.appendChild(kbd);

    // Results list
    resultsList = document.createElement('ul');
    resultsList.style.cssText = [
      'margin:0', 'padding:8px 0', 'list-style:none',
      'max-height:400px', 'overflow-y:auto',
    ].join(';');

    box.appendChild(inputWrapper);
    box.appendChild(resultsList);
    overlay.appendChild(box);

    // Dismiss on backdrop click (not on box click)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    input.addEventListener('input', onInput);
    input.addEventListener('keydown', onKeydown);

    modal = overlay;
    document.body.appendChild(modal);
    input.focus();
  }

  function renderResults(): void {
    if (!resultsList) return;
    resultsList.innerHTML = '';

    if (results.length === 0) {
      const empty = document.createElement('li');
      empty.style.cssText = 'padding:16px;color:#64748b;text-align:center;font-size:14px';
      empty.textContent = 'No results found.';
      resultsList.appendChild(empty);
      return;
    }

    results.forEach((r, i) => {
      const li = document.createElement('li');
      li.style.cssText = [
        'padding:10px 16px', 'cursor:pointer', 'border-radius:6px',
        'margin:0 8px', 'transition:background 0.1s',
      ].join(';');
      li.dataset.index = String(i);

      // Title (safe)
      const title = document.createElement('div');
      title.style.cssText = 'font-size:14px;font-weight:600;color:#f1f5f9';
      title.textContent = r.title; // textContent is XSS-safe

      li.appendChild(title);

      // Snippet (safe)
      if (r.snippet) {
        const snippet = document.createElement('div');
        snippet.style.cssText = 'font-size:12px;color:#94a3b8;margin-top:2px';
        snippet.textContent = r.snippet; // textContent is XSS-safe
        li.appendChild(snippet);
      }

      li.addEventListener('mouseenter', () => setSelected(i));
      li.addEventListener('click', () => openResult(i));

      resultsList!.appendChild(li);
    });

    setSelected(0);
  }

  function setSelected(idx: number): void {
    if (!resultsList) return;
    selectedIndex = idx;
    const items = resultsList.querySelectorAll('li[data-index]');
    items.forEach((item, i) => {
      (item as HTMLElement).style.background = i === idx ? '#334155' : 'transparent';
    });
  }

  function isSafeUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch {
      return false;
    }
  }

  function openResult(idx: number): void {
    const r = results[idx];
    // Validate URL protocol to prevent javascript: injection
    if (r?.url && isSafeUrl(r.url)) {
      window.open(r.url, '_blank', 'noopener,noreferrer');
    }
    close();
  }

  // --- Search logic ---

  function onInput(): void {
    if (!input) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => doSearch(input!.value.trim()), 300);
  }

  async function doSearch(query: string): Promise<void> {
    if (!config || !resultsList) return;

    if (!query) {
      results = [];
      renderResults();
      return;
    }

    try {
      const url = new URL(`${config.endpoint}/search`);
      url.searchParams.set('q', query);
      url.searchParams.set('index', config.indexId);

      const res = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${escapeHtml(config.apiKey)}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) throw new Error(`Search failed: ${res.status}`);

      const data = await res.json() as { results?: SearchResult[] };
      results = data.results ?? [];
    } catch {
      results = [];
    }

    renderResults();
  }

  function onKeydown(e: KeyboardEvent): void {
    if (!resultsList) return;
    const itemCount = results.length;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelected(Math.min(selectedIndex + 1, itemCount - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelected(Math.max(selectedIndex - 1, 0));
        break;
      case 'Enter':
        if (selectedIndex >= 0 && selectedIndex < itemCount) {
          openResult(selectedIndex);
        }
        break;
      case 'Escape':
        close();
        break;
    }
  }

  // --- Open / Close ---

  function open(): void {
    if (isOpen) return;
    isOpen = true;
    results = [];
    selectedIndex = -1;
    createModal();
  }

  function close(): void {
    if (!isOpen) return;
    isOpen = false;
    if (debounceTimer) clearTimeout(debounceTimer);
    modal?.remove();
    modal = null;
    input = null;
    resultsList = null;
  }

  // --- Keyboard shortcut ---

  function onGlobalKeydown(e: KeyboardEvent): void {
    const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
    const modKey = isMac ? e.metaKey : e.ctrlKey;
    if (modKey && e.key === 'k') {
      e.preventDefault();
      isOpen ? close() : open();
    }
  }

  // --- Auto-init from script tag ---

  function init(cfg?: Partial<SearchKitConfig>): void {
    if (cfg) {
      config = {
        apiKey: cfg.apiKey ?? '',
        indexId: cfg.indexId ?? '',
        endpoint: cfg.endpoint ?? '',
      };
    } else {
      // Read from the current script tag
      const script = document.currentScript as HTMLScriptElement | null
        ?? document.querySelector('script[data-api-key]') as HTMLScriptElement | null;

      if (script) {
        config = {
          apiKey: script.dataset.apiKey ?? '',
          indexId: script.dataset.indexId ?? '',
          endpoint: script.dataset.endpoint ?? '',
        };
      }
    }

    document.addEventListener('keydown', onGlobalKeydown);
  }

  // Auto-init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init());
  } else {
    init();
  }

  return { init, open, close };
})();

window.SearchKit = SearchKit;
