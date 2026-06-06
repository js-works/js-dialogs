// ======================================================
// Tiny Lit-like template engine (no reactivity)
// ======================================================

type Value = string | number | boolean | null | undefined | Node | Node[];

export function html(strings: TemplateStringsArray, ...values: Value[]): DocumentFragment {
  const template = document.createElement('template');

  const { html, bindings } = build(strings, values);

  template.innerHTML = html;

  const fragment = template.content;

  apply(fragment, bindings);

  return fragment;
}

// ======================================================
// Build phase (string + binding metadata)
// ======================================================

type Binding =
  | { type: 'text'; id: string; value: Value }
  | { type: 'attr'; id: string; name: string; kind: 'attr' | 'bool' | 'prop'; value: Value };

function build(strings: TemplateStringsArray, values: Value[]) {
  let html = '';
  const bindings: Binding[] = [];

  for (let i = 0; i < strings.length; i++) {
    html += strings[i];

    if (i < values.length) {
      const raw = values[i];
      const id = `__b${i}__`;

      const last = strings[i];
      const isAttr = /=\s*$/.test(last.trim());

      if (isAttr) {
        const attrName = extractAttrName(last);

        let kind: 'attr' | 'bool' | 'prop' = 'attr';

        if (attrName.startsWith('?')) {
          kind = 'bool';
        } else if (attrName.startsWith('.')) {
          kind = 'prop';
        }

        const safeName = kind === 'bool' || kind === 'prop' ? attrName.slice(1) : attrName;

        html += `"${id}"`;

        bindings.push({
          type: 'attr',
          id,
          name: safeName,
          kind,
          value: raw,
        });
      } else {
        html += `<span data-b="${id}"></span>`;
        bindings.push({
          type: 'text',
          id,
          value: raw,
        });
      }
    }
  }

  return { html, bindings };
}

// ======================================================
// Apply phase (DOM patching)
// ======================================================

function apply(root: DocumentFragment, bindings: Binding[]) {
  const map = new Map(bindings.map((b) => [b.id, b]));

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);

  while (walker.nextNode()) {
    const el = walker.currentNode as HTMLElement;

    // TEXT bindings
    if (el.hasAttribute('data-b')) {
      const id = el.getAttribute('data-b')!;
      const b = map.get(id);

      if (b?.type === 'text') {
        el.replaceWith(renderValue(b.value));
      }
      continue;
    }

    // ATTRIBUTE / PROPERTY bindings
    for (const attr of Array.from(el.attributes)) {
      const b = map.get(attr.value);
      if (!b || b.type !== 'attr') continue;

      el.removeAttribute(attr.name);

      const v = b.value;

      switch (b.kind) {
        // normal attribute
        case 'attr': {
          if (v == null || v === false) break;
          el.setAttribute(b.name, String(v));
          break;
        }

        // boolean attribute (?disabled)
        case 'bool': {
          if (v) el.setAttribute(b.name, '');
          else el.removeAttribute(b.name);
          break;
        }

        // property (.value, .checked)
        case 'prop': {
          (el as any)[b.name] = v;
          break;
        }
      }
    }
  }
}

// ======================================================
// Value rendering (text nodes)
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
  const match = str.match(/([.\?]?[a-zA-Z0-9-]+)\s*=\s*$/);
  return match ? match[1] : 'unknown';
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
// EXAMPLES
// ======================================================

const someId = 'id: 123';
const isDisabled = true;
const text = 'Hello <world>';
const items = ['A', 'B', 'C'];

const input = document.createElement('input');

const view = html`
  <div id=${someId}></div>

  <button ?disabled=${isDisabled}>Click me</button>

  ${input}

  <input .value=${'typed value'} />

  <p>${text}</p>

  <ul>
    ${items.map((i) => html`<li>${i}</li>`)}
  </ul>
`;

document.body.appendChild(view);
