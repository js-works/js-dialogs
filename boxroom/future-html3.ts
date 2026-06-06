// ======================================================
// Tiny cached Lit-like template engine
// ======================================================

type Value = string | number | boolean | null | undefined | Node | Node[];

type Binding =
  | { type: 'text'; value: Value }
  | { type: 'attr'; name: string; kind: 'attr' | 'bool' | 'prop'; value: Value };

// ------------------------------
// CACHE (important upgrade)
// ------------------------------

const TEMPLATE_CACHE = new Map<string, HTMLTemplateElement>();

// ------------------------------
// Public API
// ------------------------------

export function html(strings: TemplateStringsArray, ...values: Value[]): DocumentFragment {
  const key = strings.join('{{}}');

  let tpl = TEMPLATE_CACHE.get(key);

  if (!tpl) {
    tpl = document.createElement('template');

    const { html, bindings } = build(strings, values);

    tpl.innerHTML = html;

    // store bindings ON template (cached structure)
    (tpl as any).__bindings = bindings;

    TEMPLATE_CACHE.set(key, tpl);
  }

  // clone so each render is independent
  const fragment = tpl.content.cloneNode(true) as DocumentFragment;

  const bindings: Binding[] = (tpl as any).__bindings;

  apply(fragment, bindings, values);

  return fragment;
}

// ======================================================
// Build phase (structure + placeholders)
// ======================================================

function build(strings: TemplateStringsArray, values: Value[]) {
  let html = '';
  const bindings: Binding[] = [];

  for (let i = 0; i < strings.length; i++) {
    html += strings[i];

    if (i < values.length) {
      const id = `__b${i}__`;
      const last = strings[i];

      const isAttr = /=\s*$/.test(last.trim());

      if (isAttr) {
        const rawName = extractAttrName(last);

        let kind: Binding['type'] = 'attr' as any;
        let attrKind: 'attr' | 'bool' | 'prop' = 'attr';

        if (rawName.startsWith('?')) attrKind = 'bool';
        else if (rawName.startsWith('.')) attrKind = 'prop';

        const name = rawName.replace(/^[?.]/, '');

        html += `"${id}"`;

        bindings.push({
          type: 'attr',
          name,
          kind: attrKind,
          value: null, // filled at render time
        });
      } else {
        html += `<span data-b="${id}"></span>`;
        bindings.push({
          type: 'text',
          value: null,
        });
      }
    }
  }

  return { html, bindings };
}

// ======================================================
// Apply phase (fast path, no parsing)
// ======================================================

function apply(root: DocumentFragment, bindings: Binding[], values: Value[]) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);

  let valueIndex = 0;

  while (walker.nextNode()) {
    const el = walker.currentNode as HTMLElement;

    // TEXT
    if (el.hasAttribute('data-b')) {
      const v = values[valueIndex++];

      el.replaceWith(renderValue(v));
      continue;
    }

    // ATTRIBUTES
    for (const attr of Array.from(el.attributes)) {
      if (!attr.value.startsWith('__b')) continue;

      const v = values[valueIndex++];
      const binding = bindings[valueIndex - 1];

      el.removeAttribute(attr.name);

      // BOOL
      if (attr.name.startsWith('?')) {
        if (v) el.setAttribute(attr.name.slice(1), '');
        continue;
      }

      // PROP
      if (attr.name.startsWith('.')) {
        (el as any)[attr.name.slice(1)] = v;
        continue;
      }

      // NORMAL ATTR
      if (v != null && v !== false) {
        el.setAttribute(attr.name, String(v));
      }
    }
  }
}

// ======================================================
// Rendering values
// ======================================================

function renderValue(v: Value): Node {
  if (v == null || v === false) return document.createTextNode('');
  if (v === true) return document.createTextNode('');

  if (Array.isArray(v)) {
    const frag = document.createDocumentFragment();
    v.forEach((x) => frag.appendChild(renderValue(x)));
    return frag;
  }

  if (v instanceof Node) return v;

  return document.createTextNode(escape(String(v)));
}

// ======================================================
// Helpers
// ======================================================

function extractAttrName(str: string): string {
  const m = str.match(/([.\?]?[a-zA-Z0-9-]+)\s*=\s*$/);
  return m ? m[1] : 'unknown';
}

function escape(str: string): string {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// ======================================================
// EXAMPLE USAGE
// ======================================================

const someId = 'id: 123';
const disabled = true;
const text = 'Hello <world>';

const items = ['A', 'B', 'C'];

const input = document.createElement('input');

const view = html`
  <div id=${someId}></div>

  <button ?disabled=${disabled}>Click</button>

  <input .value=${'typed'} />

  <p>${text}</p>

  ${input}

  <ul>
    ${items.map((i) => html`<li>${i}</li>`)}
  </ul>
`;

document.body.appendChild(view);
