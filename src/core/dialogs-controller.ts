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
    const customDialogTagName = CustomDialog.prepare();

    const dialogElem = document.createElement(customDialogTagName);
    targetContainer.append(dialogElem);
    console.log(dialogElem);
  }
}

// =================================================================
// Dialog custom element
// =================================================================

class CustomDialog extends HTMLElement {
  static #tagName = "internal-dialog-" + Date.now();

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot!.adoptedStyleSheets = [dialogStyles];

    const content = html`
      <dialog>
        <div class="header">
          <div class="titles">
            <div slot="title" class="title">Add user</div>
            <div slot="subtitle" class="subtitle">
              Please enter ther user's data
            </div>
          </div>
          <div slot="close-button">
            <button class="close-button">${closeIcon.getSvgText()}</button>
          </div>
        </div>
        <div class="body">
          <div slot="intro" class="intro">Intro</div>
          <div slot="content" class="content">Content</div>
          <div slot="outro" class="outro">Outro</div>
        </div>
        <div class="footer">
          <div slot="buttons" class="buttons">
            <button class="secondary">Cancel</button>
            <button class="primary">Add user</button>
          </div>
        </div>
      </dialog>
    `;

    const dialogElem = htmlElement<HTMLDialogElement>(content.asString());
    this.shadowRoot!.append(dialogElem);

    setTimeout(() => {
      dialogElem.showModal();
    }, 300);
  }

  connectedCallback() {}

  static prepare(): string {
    if (!customElements.get(CustomDialog.#tagName)) {
      customElements.define(CustomDialog.#tagName, CustomDialog);
    }

    return CustomDialog.#tagName;
  }
}

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
      htmlText === null || htmlText === undefined
        ? ""
        : String(htmlText).trim();
  }

  asString() {
    return this.#htmlText;
  }

  toString() {
    return `HtmlContent(${limitStringLength(this.#htmlText, 20)})`;
  }
}

function html(strings: TemplateStringsArray, ...values: string[]) {
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

function htmlElement<T = HTMLElement>(htmlText: string) {
  const elem = document.createElement("div");
  elem.innerHTML = htmlText;

  if (elem.childElementCount !== 1) {
    throw new Error("Must have exactly one root element");
  }

  return elem.firstElementChild as T;
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

function svg(strings: TemplateStringsArray, ...values: unknown[]) {
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
  #cssText: string;
  #styleSheet: CSSStyleSheet | null = null;

  constructor(cssText: String) {
    this.#cssText =
      cssText === null || cssText === undefined ? "" : String(cssText);
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

// =================================================================
// Styles
// =================================================================

const theme = {
  primaryColor: "blue",
  borderColor: "#eee",
  borderRadius: "4px",
  textColor: "lightDark(black, white)",
  dialogBackgroundColor: "lightDark(white, #333)",
};

const dialogStyles = css`
  dialog {
    position: fixed;
    top: 30%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: ${theme.textColor};
    background-color: ${theme.dialogBackgroundColor};
    border: none;
    border-radius: ${theme.borderRadius};
    outline: none;
    min-width: 25em;
    box-sizing: border-box;
    padding: 0;
    margin: 0;

    &::backdrop {
      background: rgba(0, 0, 0, 0.15);
      backdrop-filter: blur(3px);
    }

    .header {
      display: flex;
      align-items: flex-start;
      gap: 1em;
      padding: 0.75em 1.25em;
      width: 100%;
      box-sizing: border-box;

      .titles {
        display: flex;
        flex-direction: column;
        width: 100%;
        padding: 0.25em 0;
        gap: 0.125em;

        .title {
          font-size: 1.15em;
        }

        .subtitle {
          font-size: 0.85em;
          line-height: 0.85em;
        }
      }

      .close-button {
        border: none;
        outline: none;
        border-radius: 3px;
        padding: 0.3em;
        margin: 0;
        font-size: 1em;
        line-height: 0;
        background-color: transparent;
        cursor: pointer;

        &:hover {
          background-color: light-dark(
            color-mix(in srgb, #f0f0f0, black 10%),
            color-mix(in srgb, #f0f0f0, white 10%)
          );
        }

        &:active {
          background-color: light-dark(
            color-mix(in srgb, #f0f0f0, black 20%),
            color-mix(in srgb, #f0f0f0, white 20%)
          );
        }
      }
    }

    .body {
      padding: 0.75em 1.25em;
      min-height: 4em;
    }

    .footer {
      padding: 0.75em 1em;
      user-select: none;

      .buttons {
        display: flex;
        justify-content: flex-end;
        gap: 0.4em;

        button {
          outline: none;
          border: none;
          padding: 0.25em 0.5em;
          border-radius: 3px;
          padding: 0.5em 0.75em;
          cursor: pointer;

          &.primary {
            color: white;
            background-color: #479ef5;

            &:hover {
              background-color: light-dark(
                color-mix(in srgb, #479ef5, black 15%),
                color-mix(in srgb, #479ef5, white 15%)
              );
            }

            &:active {
              background-color: light-dark(
                color-mix(in srgb, #479ef5, black 25%),
                color-mix(in srgb, #479ef5, white 25%)
              );
            }
          }

          &.secondary {
            color: black;
            background-color: #eee;

            &:hover {
              background-color: light-dark(
                color-mix(in srgb, #eee, black 10%),
                color-mix(in srgb, #eee, white 10%)
              );
            }

            &:active {
              background-color: light-dark(
                color-mix(in srgb, #eee, black 20%),
                color-mix(in srgb, #eee, white 20%)
              );
            }
          }
        }
      }
    }
  }
`.asStyleSheet();

// =================================================================
// Icons
// =================================================================

const closeIcon = svg`
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"/>
  </svg>
`;
