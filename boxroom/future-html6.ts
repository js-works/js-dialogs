// ======================================================
// Minimal professional Lit-like renderer with patching
// - Focus-preserving
// - Keyed arrays
// - Nested templates
// - Boolean/property/attribute bindings
// ======================================================

type Primitive = string | number | boolean | null | undefined;
type Value = Primitive | Node | HtmlResult | Value[];

export type HtmlResult = {
  kind: 'html';
  strings: TemplateStringsArray;
  values: Value[];
};

// ======================================================
// TAG FUNCTION
// ======================================================

export function html(strings: TemplateStringsArray, ...values: Value[]): HtmlResult {
  return { kind: 'html', strings, values };
}

// ======================================================
// TEMPLATE CACHE
// ======================================================

const TPL_CACHE = new Map<string, HTMLTemplateElement>();

function getTemplate(strings: TemplateStringsArray) {
  const key = strings.join('{{}}');
  let tpl = TPL_CACHE.get(key);
  if (!tpl) {
    tpl = document.createElement('template');
    tpl.innerHTML = compile(strings);
    TPL_CACHE.set(key, tpl);
  }
  return tpl;
}

// ======================================================
// COMPILE TEMPLATE: insert slot markers
// ======================================================

function compile(strings: TemplateStringsArray): string {
  let out = '';
  for (let i = 0; i < strings.length; i++) {
    out += strings[i];
    if (i < strings.length - 1) {
      const last = strings[i];
      const isAttr = /=\s*$/.test(last.trim());
      const marker = `__slot_${i}__`;
      if (isAttr) out += `"${marker}"`;
      else out += `<i data-i="${i}"></i>`;
    }
  }
  return out;
}

// ======================================================
// RENDER AND PATCH
// ======================================================

export function mount(container: Element, tpl: HtmlResult) {
  const newFrag = renderHtmlResult(tpl);
  patch(container, newFrag);
}

// ======================================================
// CORE RENDERING LOGIC
// ======================================================

function render(value: Value): Node {
  if (value == null || value === false) return document.createTextNode('');
  if (value === true) return document.createTextNode('');
  if (value instanceof Node) return value;
  if (Array.isArray(value)) {
    const frag = document.createDocumentFragment();
    for (const v of value) frag.appendChild(render(v));
    return frag;
  }
  if (isHtml(value)) return renderHtmlResult(value);
  return document.createTextNode(String(value));
}

function isHtml(v: any): v is HtmlResult {
  return v?.kind === 'html';
}

// ======================================================
// HTML RESULT TO DOM
// ======================================================

function renderHtmlResult(tpl: HtmlResult): DocumentFragment {
  const template = getTemplate(tpl.strings);
  const frag = template.content.cloneNode(true) as DocumentFragment;

  // slot nodes first
  const slots = Array.from(frag.querySelectorAll('[data-i]'));
  for (const s of slots) {
    const i = Number((s as HTMLElement).dataset.i);
    const value = tpl.values[i];
    s.replaceWith(render(value));
  }

  // attributes / boolean / property bindings
  bindAttributes(frag, tpl.values);

  return frag;
}

// ======================================================
// ATTRIBUTE / PROPERTY BINDINGS
// ======================================================

function bindAttributes(root: ParentNode, values: Value[]) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const el = node as HTMLElement;
    for (const attr of Array.from(el.attributes)) {
      if (!attr.value.startsWith('__slot_')) continue;
      const index = Number(attr.value.replace(/\D/g, ''));
      const value = values[index];
      el.removeAttribute(attr.name);

      if (attr.name.startsWith('?')) {
        if (value) el.setAttribute(attr.name.slice(1), '');
        continue;
      }

      if (attr.name.startsWith('.')) {
        (el as any)[attr.name.slice(1)] = value;
        continue;
      }

      if (value != null && value !== false) {
        el.setAttribute(attr.name, String(value));
      }
    }
  }
}

// ======================================================
// KEYED PATCHING
// ======================================================

export function key<T extends Node>(k: string | number, node: T): T {
  (node as any).__key = k;
  return node;
}

function patch(container: Element, newFrag: DocumentFragment) {
  const oldNodes = Array.from(container.childNodes);
  const newNodes = Array.from(newFrag.childNodes);

  const keyedMap = new Map<any, Node>();
  for (const n of oldNodes) {
    const k = (n as any).__key;
    if (k != null) keyedMap.set(k, n);
  }

  let last: Node | null = null;
  for (const n of newNodes) {
    const k = (n as any).__key;
    let target: Node | undefined;
    if (k != null) {
      target = keyedMap.get(k);
      keyedMap.delete(k);
    }

    if (target && target.parentNode === container) {
      container.replaceChild(n, target);
    } else {
      if (!last) container.insertBefore(n, container.firstChild);
      else container.insertBefore(n, last.nextSibling);
    }

    last = n;
  }

  // remove leftover nodes
  for (const leftover of keyedMap.values()) {
    if (leftover.parentNode === container) container.removeChild(leftover);
  }
}
