export { html, DialogController };

type Renderable<C> = C | string | number | null | undefined;

interface BaseDialogConfig<C> {
  title?: Renderable<C>;
  subtitle?: Renderable<C>;
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

interface ButtonConfig {
  id: Symbol;
  appearance: "primary" | "secondary" | "danger";
  text: string;
}

class DialogController<C> implements Ctrl<C> {
  readonly #okBtn: ButtonConfig = {
    id: Symbol("ok"),
    appearance: "primary",
    text: "Ok",
  };

  readonly #okBtnDanger: ButtonConfig = {
    id: Symbol("ok"),
    appearance: "danger",
    text: "Ok",
  };

  readonly #cancelBtn: ButtonConfig = {
    id: Symbol("cancel"),
    appearance: "secondary",
    text: "Cancel",
  };

  async info(config: MessageDialogConfig<C>): Promise<void> {
    await this.#openDialog(config, [this.#okBtn]);
  }

  async success(config: MessageDialogConfig<C>): Promise<void> {
    await this.#openDialog(config, [this.#okBtn]);
  }

  async warn(config: MessageDialogConfig<C>): Promise<void> {
    await this.#openDialog(config, [this.#okBtn]);
  }

  async error(config: MessageDialogConfig<C>): Promise<void> {
    await this.#openDialog(config, [this.#okBtn]);
  }

  async approve(config: MessageDialogConfig<C>): Promise<void> {
    await this.#openDialog(config, [this.#okBtnDanger, this.#cancelBtn]);
  }

  async #openDialog(
    baseConfig: BaseDialogConfig<C>,
    buttons: ButtonConfig[],
  ): Promise<any> {
    const targetContainer = document.body;
    const customDialogTagName = CustomDialog.prepare();

    const dialogElem = h(customDialogTagName, { className: "dlg-dialog" });

    const closeButton = h("button", { className: "dlg-dialog__close-button" });

    closeButton.innerHTML = closeIcon.getSvgText();
    const closeButtonContainer = h(
      "div",
      { slot: "close-button" },
      closeButton,
    );
    dialogElem.append(closeButtonContainer);

    for (const key of [
      "title",
      "subtitle",
      "intro",
      "content",
      "outro",
    ] as const) {
      const renderable = baseConfig[key];

      if (renderable) {
        const elem = h<HTMLDivElement>("div");

        if (renderable instanceof HtmlContent) {
          elem.innerHTML = renderable.asString();
        } else {
          elem.innerText = renderable.toString();
        }

        const content = h("div", { slot: key }, elem);

        dialogElem.append(content);
      }
    }

    for (const buttonConfig of buttons) {
      const buttonContainer = h(
        "button",
        {
          className: "dlg-dialog__action-button",
          slot: "button",
          "data-appearance": buttonConfig.appearance,
        },
        buttonConfig.text,
      );

      dialogElem.append(buttonContainer);
    }

    targetContainer.append(dialogElem);
  }
}

// =================================================================
// Dialog custom element
// =================================================================

class CustomDialog extends HTMLElement {
  static readonly #tagName = "internal-dialog-" + Date.now();

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot!.adoptedStyleSheets = [dialogStyles];

    const content = html`
      <dialog>
        <div class="header">
          <div class="titles">
            <slot name="title" class="title"></slot>
            <slot name="subtitle" class="subtitle"></slot>
          </div>
          <slot name="close-button"></slot>
        </div>
        <div class="body">
          <slot name="intro" class="intro"></slot>
          <slot name="content" class="content"></slot>
          <slot name="outro" class="outro"></slot>
        </div>
        <div class="footer">
          <slot name="button" class="buttons"></slot>
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

    document.adoptedStyleSheets = [
      ...document.adoptedStyleSheets,
      globalStyles.asStyleSheet(),
    ];
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

function h<T extends Element = Element>(
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
  primaryTextColor: "white",
  primaryBackgroundColor: "blue",
  secondaryTextColor: "black",
  secondaryBackgroundColor: "white",
  secondaryBorderColor: "#b0b0b0",
  dangerTextColor: "white",
  dangerBackgroundColor: "#BE4545FF",
  borderColor: "#eee",
  borderRadius: "4px",
  textColor: "lightDark(black, white)",
  dialogBackgroundColor: "lightDark(white, #333)",
};

const globalStyles = css`
  .dlg-dialog {
    border: 2px solid red;
    font-size: 16px;
    font-family:
      -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial,
      sans-serif;
  }

  .dlg-dialog__action-button {
    outline: none;
    border: none;
    border-radius: 3px;
    padding: 0.5em 1.5em;
    cursor: pointer;

    &[data-appearance="primary"] {
      color: ${theme.primaryTextColor};
      background-color: ${theme.primaryBackgroundColor};

      &::hover {
        background-color: color-mix(
          in srgb,
          ${theme.primaryBackgroundColor},
          black 10%
        );
      }
    }

    &[data-appearance="secondary"] {
      color: ${theme.secondaryTextColor};
      background-color: ${theme.secondaryBackgroundColor};
      border: 1px solid ${theme.secondaryBorderColor};

      &:hover {
        background-color: color-mix(
          in srgb,
          ${theme.secondaryBackgroundColor},
          black 5%
        );
      }

      &:active {
        background-color: color-mix(
          in srgb,
          ${theme.secondaryBackgroundColor},
          black 10%
        );
      }
    }

    &[data-appearance="danger"] {
      color: ${theme.dangerTextColor};
      background-color: ${theme.dangerBackgroundColor};

      &:hover {
        background-color: color-mix(
          in srgb,
          ${theme.dangerBackgroundColor},
          black 15%
        );
      }

      &:active {
        background-color: color-mix(
          in srgb,
          ${theme.dangerBackgroundColor},
          black 40%
        );
      }
    }
  }

  .dlg-dialog__close-button {
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
        color-mix(in srgb, white, black 10%),
        color-mix(in srgb, black, white 10%)
      );
    }

    &:active {
      background-color: light-dark(
        color-mix(in srgb, #f0f0f0, black 20%),
        color-mix(in srgb, #f0f0f0, white 20%)
      );
    }
  }
`;

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
          display: block;
          font-size: 1.15em;
        }

        .subtitle {
          display: block;
          font-size: 0.9em;
          line-height: 0.85em;
        }
      }
    }

    .body {
      display: flex;
      flex-direction: column;
      gap: 0.5em;
      padding: 0.75em 1.25em;
      min-height: 4em;

      .intro,
      .content,
      .outro {
        display: block;
      }
    }

    .footer {
      padding: 0.75em 1em;
      user-select: none;

      .buttons {
        display: flex;
        flex-direction: row-reverse;
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
