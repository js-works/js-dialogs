import { escapeHtml, limitStringLength } from "./utils.js" 

export { css, CssContent }

class CssContent {
  #cssText: string;
  #styleSheet: CSSStyleSheet | null = null;

  constructor(cssText: String) {
    this.#cssText = cssText === null || cssText === undefined ? '' : String(cssText);
  }

  asStyleSheet() {
    if (this.#styleSheet) {
      return this.#styleSheet;
    }

    this.#styleSheet = new CSSStyleSheet();
    this.#styleSheet.replaceSync(this.#cssText);
    return this.#styleSheet;
  }

  getCssText() {
    return this.#cssText;
  }

  toString() {
    return `CssContent(${limitStringLength(this.#cssText, 20)})`;
  }
}

function css(strings: TemplateStringsArray, ...values: unknown[]) {
  const content = strings.reduce((result, str, i) => {
    const value = values[i];
    const htmlText = value instanceof CssContent ? value.getCssText() : escapeHtml(value);

    return `${result}${str}${htmlText}`;
  }, '');

  return new CssContent(content);
}

function classNames(config: {}) {
  let ret = '';

  for (const [key, value] of Object.entries(config)) {
    if (value) {
      ret = ret === '' ? key : `${ret} ${key}`;
    }
  }

  return ret;
}

function addStyles(cssContent: CssContent, target = document) {
  const styleSheet = new CSSStyleSheet();
  styleSheet.replaceSync(cssContent.getCssText());
  target.adoptedStyleSheets = [...target.adoptedStyleSheets, styleSheet];

  return () => {
    target.adoptedStyleSheets = target.adoptedStyleSheets.filter((it) => it != styleSheet);
  };
}
