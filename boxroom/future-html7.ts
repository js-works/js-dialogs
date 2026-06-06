// ======================================================
// Minimal Signal-Based Reactive DOM Runtime
// Focus-safe, fine-grained, no re-rendering
// ======================================================

// -----------------------------
// SIGNAL CORE
// -----------------------------

type Effect = () => void;

let activeEffect: Effect | null = null;

function effect(fn: Effect) {
  const run = () => {
    activeEffect = run;
    fn();
    activeEffect = null;
  };
  run();
}

export function createSignal<T>(value: T): [() => T, (v: T) => void] {
  const subs = new Set<Effect>();

  const read = () => {
    if (activeEffect) subs.add(activeEffect);
    return value;
  };

  const write = (v: T) => {
    value = v;
    subs.forEach((fn) => fn());
  };

  return [read, write];
}

// -----------------------------
// TEMPLATE TYPES
// -----------------------------

type Primitive = string | number | boolean | null | undefined;
type Value = Primitive | Node | HtmlResult | (() => any) | Value[];

export type HtmlResult = {
  kind: 'html';
  strings: TemplateStringsArray;
  values: Value[];
};

// -----------------------------
// TAG
// -----------------------------

export function html(strings: TemplateStringsArray, ...values: Value[]): HtmlResult {
  return { kind: 'html', strings, values };
}

// -----------------------------
// TEMPLATE CACHE
// -----------------------------

const CACHE = new Map<string, HTMLTemplateElement>();

function getTemplate(strings: TemplateStringsArray) {
  const key = strings.join('{{}}');

  let tpl = CACHE.get(key);
  if (!tpl) {
    tpl = document.createElement('template');
    tpl.innerHTML = compile(strings);
    CACHE.set(key, tpl);
  }

  return tpl;
}

// -----------------------------
// COMPILER
// -----------------------------

function compile(strings: TemplateStringsArray): string {
  let out = '';

  for (let i = 0; i < strings.length; i++) {
    out += strings[i];

    if (i < strings.length - 1) {
      const isAttr = /=\s*$/.test(strings[i].trim());

      const marker = `__s${i}__`;

      if (isAttr) out += `"${marker}"`;
      else out += `<i data-i="${i}"></i>`;
    }
  }

  return out;
}

// -----------------------------
// PUBLIC MOUNT
// -----------------------------

export function mount(container: Element, tpl: HtmlResult) {
  container.replaceChildren(render(tpl));
}

// -----------------------------
// RESOLVE VALUES
// -----------------------------

function resolve(v: any): any {
  return typeof v === 'function' ? v() : v;
}

// -----------------------------
// CORE RENDER
// -----------------------------

function render(v: Value): Node {
  v = resolve(v);

  if (v == null || v === false) return document.createTextNode('');
  if (v === true) return document.createTextNode('');
  if (v instanceof Node) return v;

  if (Array.isArray(v)) {
    const frag = document.createDocumentFragment();
    for (const x of v) frag.appendChild(render(x));
    return frag;
  }

  if (isHtml(v)) return renderHtml(v);

  return document.createTextNode(String(v));
}

function isHtml(v: any): v is HtmlResult {
  return v?.kind === 'html';
}

// -----------------------------
// HTML RENDER
// -----------------------------

function renderHtml(tpl: HtmlResult): DocumentFragment {
  const template = getTemplate(tpl.strings);
  const frag = template.content.cloneNode(true) as DocumentFragment;

  const slots = Array.from(frag.querySelectorAll('[data-i]'));

  for (const s of slots) {
    const i = Number((s as HTMLElement).dataset.i);
    s.replaceWith(render(tpl.values[i]));
  }

  bind(frag, tpl.values);

  return frag;
}

// -----------------------------
// BINDINGS (SIGNAL-AWARE)
// -----------------------------

function bind(root: ParentNode, values: Value[]) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);

  let node: Node | null;

  while ((node = walker.nextNode())) {
    const el = node as HTMLElement;

    for (const attr of Array.from(el.attributes)) {
      if (!attr.value.startsWith('__')) continue;

      const index = Number(attr.value.replace(/\D/g, ''));
      const raw = values[index];

      const name = attr.name;
      el.removeAttribute(name);

      // BOOLEAN
      if (name.startsWith('?')) {
        const real = name.slice(1);

        effect(() => {
          const v = resolve(raw);
          if (v) el.setAttribute(real, '');
          else el.removeAttribute(real);
        });

        continue;
      }

      // PROPERTY
      if (name.startsWith('.')) {
        const prop = name.slice(1);

        effect(() => {
          (el as any)[prop] = resolve(raw);
        });

        continue;
      }

      // ATTRIBUTE
      effect(() => {
        const v = resolve(raw);
        if (v == null || v === false) el.removeAttribute(name);
        else el.setAttribute(name, String(v));
      });
    }
  }
}

// ======================================================
// KEY (optional stability for lists)
// ======================================================

export function key<T extends Node>(k: string | number, node: T): T {
  (node as any).__key = k;
  return node;
}

// ======================================================
// EXAMPLES
// ======================================================

// -----------------------------
// Example 1: simple reactivity + focus-safe input
// -----------------------------

const [name, setName] = createSignal('Alice');
const [error, setError] = createSignal(false);

mount(
  document.body,
  html`
    <div>
      <input .value=${name} ?disabled=${error} class=${() => (error() ? 'err' : '')} />
      <button onclick=${() => setError(!error())}>Toggle Error</button>
      <p>Hello ${name}</p>
    </div>
  `
);

// simulate typing update
setTimeout(() => setName('Bob'), 1000);

// -----------------------------
// Example 2: dynamic list
// -----------------------------

const [items, setItems] = createSignal(['A', 'B']);

const list = document.createElement('div');
document.body.appendChild(list);

mount(
  list,
  html`
    <ul>
      ${() => items().map((x) => html`<li>${x}</li>`)}
    </ul>
  `
);

setTimeout(() => setItems(['A', 'B', 'C']), 1500);

// -----------------------------
// Example 3: toggle UI state
// -----------------------------

const panel = document.createElement('div');
document.body.appendChild(panel);

const [open, setOpen] = createSignal(true);

mount(
  panel,
  html`
    <button onclick=${() => setOpen(!open())}>Toggle</button>
    ${() => (open() ? html`<div>OPEN</div>` : html`<div>CLOSED</div>`)}
  `
);
