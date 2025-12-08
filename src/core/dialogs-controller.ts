type Renderable<C> = C | string | number | null | undefined;

interface BaseDialogConfig<C> {
  title?: Renderable<C>;
  intro?: Renderable<C>;
  content?: Renderable<C>;
  outro?: Renderable<C>;
}

interface MessageDialogConfig<C> extends BaseDialogConfig<C> {}

interface Ctrl<C> {
  info(config: MessageDialogConfig<C>): Promise<void>;
  success(config: MessageDialogConfig<C>): Promise<void>;
  warn(config: MessageDialogConfig<C>): Promise<void>;
  error(config: MessageDialogConfig<C>): Promise<void>;
}

export class DialogController<C> implements Ctrl<C> {
  async info(config: MessageDialogConfig<C>): Promise<void> {
    await this.#openDialog(config);
  }

  async success(config: MessageDialogConfig<C>): Promise<void> {
    await this.#openDialog(config);
  }

  async warn(config: MessageDialogConfig<C>): Promise<void> {
    await this.#openDialog(config);
  }

  async error(config: MessageDialogConfig<C>): Promise<void> {
    await this.#openDialog(config);
  }

  async #openDialog(baseConfig: BaseDialogConfig<C>): Promise<any> {
    const targetContainer = document.body;
  }
}

// =================================================================
// Contents
// =================================================================

// =================================================================
// Utilities
// =================================================================

function freeze(obj: {}) {
  return Object.freeze(obj);
}

function limitStringLength(s: string, maxLength: number) {
  return s.length < maxLength ? s : s.substring(0, maxLength - 3) + "...";
}

function escapeHtml(s: unknown) {
  return s === null || s === undefined
    ? ""
    : String(s)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function isIterable(value: unknown): value is Iterable<unknown> {
  return (
    typeof value === "object" && value !== null && Symbol.iterator in value
  );
}

// =================================================================
// HTML
// =================================================================

class HtmlContent {
  #htmlText;

  constructor(htmlText: string) {
    this.#htmlText =
      htmlText === null || htmlText === undefined ? "" : String(htmlText);
  }

  asString() {
    return this.#htmlText;
  }

  toString() {
    return `HtmlContent(${limitStringLength(this.#htmlText, 20)})`;
  }
}

function html(strings: string[], ...values: string[]) {
  const tokens: unknown[] = [];

  const handleValue = (value: unknown) => {
    if (typeof value === "string") {
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

  return new HtmlContent(tokens.join(""));
}

html.raw = (htmlText: string) => new HtmlContent(htmlText);

function htmlElement(htmlText: string) {
  const elem = document.createElement("div");
  elem.innerHTML = htmlText;

  if (elem.childElementCount !== 1) {
    throw new Error("Must have exactly one root element");
  }

  return elem.firstElementChild;
}

function toHtmlContent(htmlContentOrPlainText: HtmlContent | string) {
  return htmlContentOrPlainText instanceof HtmlContent
    ? htmlContentOrPlainText
    : new HtmlContent(escapeHtml(htmlContentOrPlainText));
}

// =================================================================
// SVG
// =================================================================

class SvgContent {
  #content;

  constructor(content: string) {
    this.#content = content;
  }

  getSvgText() {
    return this.#content;
  }
}

function svg(strings: string[], ...values: unknown[]) {
  const text = strings.reduce(
    (result, str, i) => `${result}${str}${values[i] || ""}`,
    "",
  );

  return new SvgContent(text);
}

// =================================================================
// CSS
// =================================================================

class CssContent {
  #cssText;

  constructor(cssText: String) {
    this.#cssText =
      cssText === null || cssText === undefined ? "" : String(cssText);
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
    const htmlText =
      value instanceof CssContent ? value.getCssText() : escapeHtml(value);

    return `${result}${str}${htmlText}`;
  }, "");

  return new CssContent(content);
}

function classNames(config: {}) {
  let ret = "";

  for (const [key, value] of Object.entries(config)) {
    if (value) {
      ret = ret === "" ? key : `${ret} ${key}`;
    }
  }

  return ret;
}

function addStyles(cssContent: CssContent, target = document) {
  const styleSheet = new CSSStyleSheet();
  styleSheet.replaceSync(cssContent.getCssText());
  target.adoptedStyleSheets = [...target.adoptedStyleSheets, styleSheet];

  return () => {
    target.adoptedStyleSheets = target.adoptedStyleSheets.filter(
      (it) => it != styleSheet,
    );
  };
}
