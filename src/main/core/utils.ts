export { escapeHtml, isIterable, limitStringLength }

function escapeHtml(s: unknown) {
  return s === null || s === undefined
    ? ''
    : String(s)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function isIterable(value: unknown): value is Iterable<unknown> {
  return typeof value === 'object' && value !== null && Symbol.iterator in value;
}

function limitStringLength(s: string, maxLength: number) {
  return s.length < maxLength ? s : s.substring(0, maxLength - 3) + '...';
}