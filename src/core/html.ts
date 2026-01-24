import { SvgContent } from "./svg";
import { escapeHtml, isIterable, limitStringLength } from "./utils";

export { h, html, toHtmlElement, HtmlContent }

function h<T extends HTMLElement = HTMLElement>(
  tagName: string,
  attrs?: Record<string, unknown> | null,
  ...children: (Node | string | null | undefined)[]
): T {
  const ret = document.createElement(tagName);

  if (attrs) {
    Object.keys(attrs).forEach((key) => {
      if (key in ret) {
        (ret as any)[key] = attrs[key];
      } else {
        ret.setAttribute(key, String(attrs[key]));
      }
    });
  }

  if (children) {
    for (const child of children) {
      if (child) {
        ret.append(child);
      }
    }
  }

  return ret as unknown as T;
}

class HtmlContent {
  readonly #htmlText;

  constructor(htmlText: string) {
    this.#htmlText = htmlText === null || htmlText === undefined ? '' : String(htmlText).trim();
  }

  asString() {
    return this.#htmlText;
  }

  toString() {
    return `HtmlContent(${limitStringLength(this.#htmlText, 20)})`;
  }
}

function html(strings: TemplateStringsArray, ...values: (string | null)[]) {
  const tokens: unknown[] = [];

  const handleValue = (value: unknown) => {
    if (typeof value === 'string') {
      tokens.push(value);
    } else if (value instanceof HtmlContent) {
      tokens.push(value.asString());
    } else if (value instanceof SvgContent) {
      tokens.push(value.getSvgText());
    } else if (isIterable(value)) {
      for (const item of value) {
        handleValue(item);
      }
    } else if (value !== null && value !== undefined) {
      tokens.push(escapeHtml(value));
    }
  };

  strings.forEach((str, idx) => {
    tokens.push(str);
    handleValue(values[idx]);
  });

  return new HtmlContent(tokens.join(''));
}

html.raw = (htmlText: string) => new HtmlContent(htmlText);

function toHtmlElement<T extends HTMLElement = HTMLElement>(htmlText: string): T {
  const container = document.createElement('div');
  container.innerHTML = htmlText;

  if (container.childElementCount !== 1) {
    throw new Error('Must have exactly one root element');
  }

  const elem = container.firstElementChild as T;
  elem.remove();
  return elem;
}
