// ======================================================
// Minimal but PROPER template renderer core
// (stable bindings, nested html, safe runtime model)
// ======================================================

type Value = string | number | boolean | null | undefined | Node | HtmlResult | Value[];

export type HtmlResult = {
  kind: 'html';
  strings: TemplateStringsArray;
  values: Value[];
};

// ======================================================
// TAG
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
// COMPILE TO SLOT MARKERS
// ======================================================

function compile(strings: TemplateStringsArray): string {
  let out = '';

  for (let i = 0; i < strings.length; i++) {
    out += strings[i];

    if (i < strings.length - 1) {
      const last = strings[i];
      const isAttr = /=\s*$/.test(last.trim());

      const marker = `__slot_${i}__`;

      if (isAttr) {
        out += `"${marker}"`;
      } else {
        out += `<slot data-i="${i}"></slot>`;
      }
    }
  }

  return out;
}

// ======================================================
// PUBLIC RENDER ENTRY
// ======================================================

export function mount(container: Element, tpl: HtmlResult) {
  const node = render(tpl);
  container.replaceChildren(node);
}

// ======================================================
// CORE RENDER DISPATCH
// ======================================================

function render(v: Value): Node {
  if (v == null || v === false) return document.createTextNode('');
  if (v === true) return document.createTextNode('');

  if (v instanceof Node) return v;

  if (Array.isArray(v)) {
    const frag = document.createDocumentFragment();
    for (const x of v) frag.appendChild(render(x));
    return frag;
  }

  if (isHtml(v)) {
    return renderHtml(v);
  }

  return document.createTextNode(String(v));
}

function isHtml(v: any): v is HtmlResult {
  return v?.kind === 'html';
}

// ======================================================
// HTML INSTANCE RENDERING
// ======================================================

function renderHtml(tpl: HtmlResult): DocumentFragment {
  const template = getTemplate(tpl.strings);
  const fragment = template.content.cloneNode(true) as DocumentFragment;

  // resolve node slots
  const slots = Array.from(fragment.querySelectorAll('[data-i]'));

  for (const s of slots) {
    const i = Number((s as HTMLElement).dataset.i);
    const value = tpl.values[i];

    s.replaceWith(render(value));
  }

  // resolve attributes (second pass)
  bindAttributes(fragment, tpl.values);

  return fragment;
}

// ======================================================
// ATTRIBUTE / PROPERTY BINDING
// ======================================================

function bindAttributes(root: ParentNode, values: Value[]) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);

  let node: Node | null;

  while ((node = walker.nextNode())) {
    const el = node as HTMLElement;

    for (const attr of Array.from(el.attributes)) {
      if (!attr.value.startsWith('__slot_')) continue;

      const index = Number(attr.value.replace(/\D/g, ''));
      const v = values[index];

      el.removeAttribute(attr.name);

      // boolean attribute
      if (attr.name.startsWith('?')) {
        if (v) el.setAttribute(attr.name.slice(1), '');
        continue;
      }

      // property binding
      if (attr.name.startsWith('.')) {
        (el as any)[attr.name.slice(1)] = v;
        continue;
      }

      if (v != null && v !== false) {
        el.setAttribute(attr.name, String(v));
      }
    }
  }
}

// ======================================================
// OPTIONAL KEY HELPER
// ======================================================

export function key<T extends Node>(k: string | number, node: T): T {
  (node as any).__key = k;
  return node;
}
