/**
 * Minimal html tagged template.
 *
 * Supports:
 *   html`<div id=${123}></div>`
 *   html`<div id="id-${123}"></div>`
 *   html`<p>Hello ${name}</p>`
 *
 * Does NOT support:
 *   html`<${tag}></${tag}>`
 *   html`<div ${attr}=""></div>`
 *   html`<button onclick=${fn}></button>`
 */

export function html(strings: TemplateStringsArray, ...values: unknown[]): DocumentFragment {
  // Insert unique markers into the HTML string.
  const markers = values.map((_, i) => `__HTML_EXPR_${i}__`);

  let htmlString = '';

  for (let i = 0; i < strings.length; i++) {
    htmlString += strings[i];

    if (i < markers.length) {
      htmlString += markers[i];
    }
  }

  // Let the browser parse the HTML.
  const template = document.createElement('template');
  template.innerHTML = htmlString;

  const fragment = template.content;

  // Replace markers inside text nodes and attributes.
  const walker = document.createTreeWalker(
    fragment,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT
  );

  let node: Node | null;

  while ((node = walker.nextNode())) {
    // Text nodes
    if (node.nodeType === Node.TEXT_NODE) {
      let text = node.textContent ?? '';

      markers.forEach((marker, i) => {
        text = text.replaceAll(marker, String(values[i]));
      });

      node.textContent = text;
    }

    // Attributes
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;

      for (const attr of [...el.attributes]) {
        let value = attr.value;

        markers.forEach((marker, i) => {
          value = value.replaceAll(marker, String(values[i]));
        });

        el.setAttribute(attr.name, value);
      }
    }
  }

  return fragment;
}

/* ============================================================
 * Examples
 * ============================================================
 */

const someId = 1234;
const name = 'John';

/*
 * <div id="1234"></div>
 */
document.body.append(html`<div id=${someId}></div>`);

/*
 * <div id="id-1234"></div>
 */
document.body.append(html`<div id="id-${someId}"></div>`);

/*
 * <p>Hello John</p>
 */
document.body.append(html`<p>Hello ${name}</p>`);

/*
 * <div class="user-1234 active"></div>
 */
document.body.append(html`<div class="user-${someId} active"></div>`);

/*
 * <img src="/avatars/1234.png">
 */
document.body.append(html`<img src="/avatars/${someId}.png" />`);

/* ============================================================
 * NOT SUPPORTED
 * ============================================================
 */

// ❌ dynamic tags
// html`<${tag}></${tag}>`

// ❌ dynamic attribute names
// html`<div ${attr}="value"></div>`

// ❌ event handlers
// html`<button onclick=${handler}></button>`
