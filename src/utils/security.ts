// Parse HTML in an inert document and rebuild only safe formatting.
const FORMATTING_TAGS = new Set('p br h1 h2 h3 h4 h5 h6 strong em b i u s span div blockquote pre code ul ol li table thead tbody tfoot tr th td caption hr a img figure figcaption'.split(' '));
const DROP_TAGS = new Set('script style iframe object embed svg math template form input textarea button select option link meta base'.split(' '));

export function sanitizeHtml(input: string): string {
  if (!input || typeof input !== 'string') return '';
  const source = new DOMParser().parseFromString(input, 'text/html');
  const output = document.createElement('div');
  const safeUrl = (value: string, image = false) => {
    if (!value.trim()) return null;
    try {
      const url = new URL(value, window.location.origin);
      if (url.username || url.password) return null;
      if (url.protocol === 'https:' || url.protocol === 'http:') return url.href;
      if (!image && url.protocol === 'mailto:' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url.pathname) && !url.search) return url.href;
    } catch { /* Invalid URLs are omitted. */ }
    return null;
  };
  const copy = (node: Node, parent: Node) => {
    if (node.nodeType === Node.TEXT_NODE) { parent.appendChild(document.createTextNode(node.textContent || '')); return; }
    if (!(node instanceof Element)) return;
    const tag = node.tagName.toLowerCase();
    if (DROP_TAGS.has(tag) || node.namespaceURI !== 'http://www.w3.org/1999/xhtml') return;
    if (!FORMATTING_TAGS.has(tag)) { for (const child of node.childNodes) copy(child, parent); return; }
    const clean = document.createElement(tag);
    for (const name of ['title', ...(tag === 'img' ? ['alt'] : [])]) {
      const value = node.getAttribute(name); if (value) clean.setAttribute(name, value.slice(0, 1000));
    }
    if (tag === 'a' || tag === 'img') {
      const name = tag === 'a' ? 'href' : 'src';
      const value = safeUrl(node.getAttribute(name) || '', tag === 'img');
      if (value) clean.setAttribute(name, value);
      if (tag === 'a') clean.setAttribute('rel', 'noopener noreferrer');
      else { clean.setAttribute('loading', 'lazy'); clean.setAttribute('decoding', 'async'); }
    }
    for (const name of ['colspan', 'rowspan', 'width', 'height']) {
      const value = node.getAttribute(name);
      if (value && /^(?:[1-9][0-9]{0,3}|100%)$/.test(value)) clean.setAttribute(name, value);
    }
    // Retain editorial colors and alignment, excluding URLs and arbitrary CSS.
    for (const name of ['color', 'background-color', 'text-align', 'font-weight', 'font-style', 'text-decoration']) {
      const value = (node as HTMLElement).style?.getPropertyValue(name);
      if (value && /^[#(),.% a-z0-9-]+$/i.test(value) && !/(?:url|expression|var|attr)\s*\(/i.test(value)) clean.style.setProperty(name, value);
    }
    for (const child of node.childNodes) copy(child, clean);
    parent.appendChild(clean);
  };
  for (const child of source.body.childNodes) copy(child, output);
  return output.innerHTML;
}

/**
 * Sanitizes plain text input — escapes HTML entities.
 * Use for non-HTML text fields (names, addresses, comments).
 */
export function escapeHtml(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validates that a URL is safe to use as image source.
 * Only allows http:, https:, and relative paths.
 */
export function isSafeImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.startsWith('/')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validates that a string doesn't contain newline characters
 * (helps prevent email header injection).
 */
export function hasNoNewlines(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  // Check for carriage return, line feed, null byte, and DEL character
  return !/[\r\n]/.test(input) && !input.includes('\x00') && !input.includes('\x7f');
}

/**
 * Removes all potentially dangerous content from a string.
 * Good for search queries, IDs, and other untrusted inputs.
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/[\u003c\u003e]/g, '')
    .replace(/["'`]/g, '')
    .replace(/[\r\n]/g, '')
    .split('\x00').join('')
    .split('\x7f').join('')
    .trim();
}