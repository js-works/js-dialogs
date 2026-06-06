// ======================================================
// Minimal Lit-like renderer with node reuse
// ======================================================

type Value = string | number | boolean | null | undefined | Node | Value[];

type Binding = { type: 'text' } | { type: 'attr'; name: string; kind: 'attr' | 'bool' | 'prop' };

type Instance = {
  template: HTMLTemplateElement;
  bindings: Binding[];
};

// ----------------------
// CACHE
// ----------------------

const CACHE = new Map<string, Instance>();

// ======================================================
// PUBLIC RENDER (persistent mount)
// ======================================================

export function render(container: Element, strings: TemplateStringsArray, ...values: Value[]) {
  const key = strings.join('{{}}');

  let instance = CACHE.get(key);

  if (!instance) {
    instance = compile(strings);
    CACHE.set(key, instance);
  }

  const fragment = instance.template.content.cloneNode(true) as DocumentFragment;

  apply(fragment, instance.bindings, values, new WeakMap());

  // IMPORTANT FIX:
  // only replace if first render
  if (!container.hasChildNodes()) {
    container.appendChild(fragment);
  } else {
    patch(container, fragment);
  }
}

// ======================================================
// COMPILATION
// ======================================================

function compile(strings: TemplateStringsArray): Instance {
  let html = '';
  const bindings: Binding[] = [];

  for (let i = 0; i < strings.length; i++) {
    html += strings[i];

    if (i < strings.length - 1) {
      const last = strings[i];
      const isAttr = /=\s*$/.test(last.trim());

      const id = `__b${i}__`;

      if (isAttr) {
        const raw = extract(last);

        let kind: Binding['kind'] = 'attr';
        if (raw.startsWith('?')) kind = 'bool';
        else if (raw.startsWith('.')) kind = 'prop';

        const name = raw.replace(/^[?.]/, '');

        html += `"${id}"`;

        bindings.push({ type: 'attr', name, kind });
      } else {
        html += `<span data-b="${id}"></span>`;
        bindings.push({ type: 'text' });
      }
    }
  }

  const tpl = document.createElement('template');
  tpl.innerHTML = html;

  return { template: tpl, bindings };
}

// ======================================================
// APPLY (bind values)
// ======================================================

function apply(
  root: DocumentFragment,
  bindings: Binding[],
  values: Value[],
  memo: WeakMap<any, any>
) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);

  let vi = 0;

  while (walker.nextNode()) {
    const el = walker.currentNode as HTMLElement;

    // TEXT
    if (el.hasAttribute('data-b')) {
      el.replaceWith(renderValue(values[vi++]));
      continue;
    }

    // ATTRIBUTES
    for (const attr of Array.from(el.attributes)) {
      if (!attr.value.startsWith('__b')) continue;

      const v = values[vi++];

      el.removeAttribute(attr.name);

      if (attr.name.startsWith('?')) {
        if (v) el.setAttribute(attr.name.slice(1), '');
        continue;
      }

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
// PATCH (FIX: node reuse instead of full replace)
// ======================================================

function patch(container: Element, newTree: DocumentFragment) {
  const old = Array.from(container.childNodes);
  const fresh = Array.from(newTree.childNodes);

  // minimal reconciliation
  const len = Math.max(old.length, fresh.length);

  for (let i = 0; i < len; i++) {
    const o = old[i];
    const n = fresh[i];

    if (!o && n) container.appendChild(n);
    else if (o && !n) o.remove();
    else if (o && n && !isSame(o, n)) {
      o.replaceWith(n);
    }
  }
}

function isSame(a: Node, b: Node) {
  return a.nodeName === b.nodeName;
}

// ======================================================
// VALUE RENDERING
// ======================================================

function renderValue(v: Value): Node {
  if (v == null || v === false) return document.createTextNode('');
  if (v === true) return document.createTextNode('');

  if (Array.isArray(v)) {
    const f = document.createDocumentFragment();
    v.forEach((x) => f.appendChild(renderValue(x)));
    return f;
  }

  if (v instanceof Node) return v;

  return document.createTextNode(escape(String(v)));
}

// ======================================================
// HELPERS
// ======================================================

function extract(s: string): string {
  const m = s.match(/([.\?]?[a-zA-Z0-9-]+)\s*=\s*$/);
  return m ? m[1] : '';
}

function escape(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
