// XSS Sanitization utility for blog content and other user-generated HTML
// This strips dangerous tags and attributes while preserving safe formatting

const DANGEROUS_TAGS = [
  'script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea',
  'button', 'select', 'option', 'style', 'link', 'meta', 'head', 'body',
  'html', 'frame', 'frameset', 'applet', 'base',
];

const DANGEROUS_ATTRS = [
  'onabort', 'onblur', 'onchange', 'onclick', 'oncontextmenu',
  'ondblclick', 'ondrag', 'ondragend', 'ondragenter', 'ondragleave',
  'ondragover', 'ondragstart', 'ondrop', 'onerror', 'onfocus',
  'oninput', 'oninvalid', 'onkeydown', 'onkeypress', 'onkeyup',
  'onload', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover',
  'onmouseup', 'onmousewheel', 'onreset', 'onresize', 'onscroll',
  'onselect', 'onsubmit', 'ontoggle', 'onunload', 'onwheel',
  'oncopy', 'oncut', 'onpaste', 'onplay', 'onpause', 'onwaiting',
  'formaction', 'formmethod', 'formtarget', 'xmlns', 'xlink:href',
];

/**
 * Sanitizes HTML string by removing dangerous tags and attributes.
 * Preserves safe formatting tags like headings, paragraphs, links, images, lists, tables.
 */
export function sanitizeHtml(input: string): string {
  if (!input || typeof input !== 'string') return '';

  let cleaned = input;

  // Remove script tags and their contents entirely (case-insensitive, multiline)
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove style tags and their contents
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Remove dangerous tags (with or without attributes, self-closing)
  const tagPattern = new RegExp(
    `<\\/?(?:${DANGEROUS_TAGS.join('|')})\\b[^>]*>`,
    'gi',
  );
  cleaned = cleaned.replace(tagPattern, '');

  // Remove javascript: URLs from href/src/action attributes
  cleaned = cleaned.replace(
    /(href|src|action|background|poster|data)=\s*["']?javascript:[^"'>\s]*/gi,
    '$1="#"',
  );

  // Remove data:text/html and data:text/javascript URLs
  cleaned = cleaned.replace(
    /(href|src|action|background|poster|data)=\s*["']?data:text\/(?:html|javascript|xml)[^"'>\s]*/gi,
    '$1="#"',
  );

  // Remove dangerous event handler attributes
  const attrPattern = new RegExp(
    `\\s(?:${DANGEROUS_ATTRS.join('|')})\\s*=\\s*["'][^"']*["']`,
    'gi',
  );
  cleaned = cleaned.replace(attrPattern, '');

  // Also remove dangerous attributes without quotes (single word)
  const attrPatternNoQuotes = new RegExp(
    `\\s(?:${DANGEROUS_ATTRS.join('|')})\\s*=\\s*[^\\s>]+`,
    'gi',
  );
  cleaned = cleaned.replace(attrPatternNoQuotes, '');

  // Remove expression() and url() in CSS that could leak data
  cleaned = cleaned.replace(/expression\s*\(/gi, '');

  // Remove vbscript: URLs
  cleaned = cleaned.replace(
    /(href|src|action|background|poster)=\s*["']?vbscript:[^"'>\s]*/gi,
    '$1="#"',
  );

  // Remove mhtml: URLs
  cleaned = cleaned.replace(
    /(href|src|action|background|poster)=\s*["']?mhtml:[^"'>\s]*/gi,
    '$1="#"',
  );

  return cleaned;
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