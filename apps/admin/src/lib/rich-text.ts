import type { Value } from 'platejs';

export function isHtmlContent(content: string): boolean {
  return /<[a-z][\s\S]*>/i.test(content);
}

export function isEmptyHtml(html: string | null | undefined): boolean {
  if (!html?.trim()) return true;
  const text = html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim();
  return text.length === 0;
}

export function plainTextToValue(text: string): Value {
  const trimmed = text.trim();
  if (!trimmed) {
    return [{ type: 'p', children: [{ text: '' }] }];
  }

  return text.split('\n').map(line => ({
    type: 'p',
    children: [{ text: line }],
  }));
}

export const emptyEditorValue: Value = [{ type: 'p', children: [{ text: '' }] }];
