/**
 * Turns the HTML body Graph returns into a flat list of text blocks the app can
 * draw with its own <Text> — so the mail screen owns the font family and size
 * instead of a WebView. Deliberately lossy: no scripts, no styles from the
 * message, images dropped, tables flattened to one block per row.
 */
export type MailRun = { text: string; bold?: boolean; italic?: boolean; href?: string };
export type MailBlock = { kind: 'p' | 'h' | 'li' | 'quote'; runs: MailRun[] };

const NAMED: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—',
  hellip: '…', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', bull: '•', copy: '©',
};

function decode(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
    }
    return NAMED[e.toLowerCase()] ?? m;
  });
}

const BLOCK_TAGS = new Set([
  'p', 'div', 'tr', 'table', 'ul', 'ol', 'li', 'blockquote', 'section', 'article',
  'header', 'footer', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'hr',
]);
const SAFE_HREF = /^(https?:|mailto:|tel:)/i;

export function htmlToBlocks(html: string): MailBlock[] {
  const source = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(head|style|script|title)[^>]*>[\s\S]*?<\/\1>/gi, '');

  const blocks: MailBlock[] = [];
  let runs: MailRun[] = [];
  let kind: MailBlock['kind'] = 'p';
  let bold = 0;
  let italic = 0;
  let quote = 0;
  let listItem = false;
  const hrefs: string[] = [];

  const flush = () => {
    const cleaned = runs
      .map((r) => ({ ...r, text: r.text.replace(/[ \t\r\n]+/g, (s) => (s.includes('\n') && r.text === s ? ' ' : ' ')) }))
      .filter((r) => r.text !== '');
    if (cleaned.length) {
      cleaned[0].text = cleaned[0].text.replace(/^ +/, '');
      cleaned[cleaned.length - 1].text = cleaned[cleaned.length - 1].text.replace(/ +$/, '');
    }
    if (cleaned.some((r) => r.text.trim() !== '')) {
      blocks.push({ kind: quote > 0 && kind === 'p' ? 'quote' : kind, runs: cleaned.filter((r) => r.text !== '') });
    }
    runs = [];
    kind = quote > 0 ? 'quote' : 'p';
    listItem = false;
  };

  const push = (raw: string) => {
    if (!raw) return;
    const text = decode(raw.replace(/\s+/g, ' ').replace(/ /g, ' '));
    if (!text) return;
    runs.push({ text, bold: bold > 0 || undefined, italic: italic > 0 || undefined, href: hrefs[hrefs.length - 1] });
  };

  const re = /<(\/?)([a-z0-9]+)([^>]*)>|([^<]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    if (m[4] !== undefined) {
      push(m[4]);
      continue;
    }
    const closing = m[1] === '/';
    const tag = m[2].toLowerCase();
    const attrs = m[3] ?? '';

    if (tag === 'br') {
      runs.push({ text: '\n' });
    } else if (tag === 'b' || tag === 'strong' || /^h[1-6]$/.test(tag)) {
      bold += closing ? -1 : 1;
      if (/^h[1-6]$/.test(tag)) {
        flush();
        if (!closing) kind = 'h';
      }
    } else if (tag === 'i' || tag === 'em') {
      italic += closing ? -1 : 1;
    } else if (tag === 'a') {
      if (closing) hrefs.pop();
      else {
        const href = /href\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1];
        hrefs.push(href && SAFE_HREF.test(decode(href)) ? decode(href) : '');
      }
    } else if (tag === 'td' || tag === 'th') {
      if (closing) runs.push({ text: ' ' });
    } else if (BLOCK_TAGS.has(tag)) {
      flush();
      if (tag === 'blockquote') quote += closing ? -1 : 1;
      if (tag === 'li' && !closing) {
        kind = 'li';
        listItem = true;
      }
    }
    if (bold < 0) bold = 0;
    if (italic < 0) italic = 0;
    if (quote < 0) quote = 0;
  }
  flush();
  void listItem;
  return blocks;
}
