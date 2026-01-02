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

interface ConfirmDialogConfig<C> extends BaseDialogConfig<C> {}

interface PromptDialogConfig<C> extends BaseDialogConfig<C> {
  label?: Renderable<C>;
  value?: string | null;
}

interface Ctrl<C> {
  info(config: MessageDialogConfig<C>): Promise<Result>;
  success(config: MessageDialogConfig<C>): Promise<Result>;
  warn(config: MessageDialogConfig<C>): Promise<Result>;
  error(config: MessageDialogConfig<C>): Promise<Result>;
  confirm(config: ConfirmDialogConfig<C>): Promise<Result>;
  approve(config: ConfirmDialogConfig<C>): Promise<Result>;
  prompt(config: PromptDialogConfig<C>): Promise<Result<string | null>>;
}

type DialogType =
  | 'info'
  | 'success'
  | 'warn'
  | 'error'
  | 'confirm'
  | 'approve'
  | 'prompt'
  | 'input';

interface Result<T = null> {
  readonly confirmed: boolean;
  readonly denied: boolean;
  readonly declined: boolean;
  data: T;
}

interface ButtonConfig {
  id: Symbol;
  appearance: 'primary' | 'secondary' | 'danger';
  text: string;
}

interface DialogControllerConfig {
  renderCloseButton?: (text: string, onClick: () => void) => HTMLElement;

  renderActionButton?: (
    appearance: 'primary' | 'secondary' | 'danger',
    text: string,
    onClick: () => void
  ) => HTMLElement;

  renderPromptInput?: (
    label: string,
    value: string,
    update: (value: string) => void
  ) => void;
}

class DialogController<C> implements Ctrl<C> {
  static readonly #symbolAbort = Symbol('close');
  static readonly #symbolConfirm = Symbol('ok');
  static readonly #symbolDecline = Symbol('decline');

  readonly #config: DialogControllerConfig;

  readonly #okBtn: ButtonConfig = {
    id: DialogController.#symbolConfirm,
    appearance: 'primary',
    text: 'Ok',
  };

  readonly #okBtnDanger: ButtonConfig = {
    id: DialogController.#symbolConfirm,
    appearance: 'danger',
    text: 'Ok',
  };

  readonly #declineBtn: ButtonConfig = {
    id: DialogController.#symbolDecline,
    appearance: 'secondary',
    text: 'Cancel',
  };

  constructor(config: DialogControllerConfig) {
    this.#config = config;
  }

  async info(config: MessageDialogConfig<C>): Promise<Result> {
    return this.#openDialog('info', config, null, [this.#okBtn]);
  }

  async success(config: MessageDialogConfig<C>): Promise<Result> {
    return this.#openDialog('success', config, null, [this.#okBtn]);
  }

  async warn(config: MessageDialogConfig<C>): Promise<Result> {
    return this.#openDialog('warn', config, null, [this.#okBtnDanger]);
  }

  async error(config: MessageDialogConfig<C>): Promise<Result> {
    return this.#openDialog('error', config, null, [this.#okBtnDanger]);
  }

  async confirm(config: ConfirmDialogConfig<C>): Promise<Result> {
    return this.#openDialog('confirm', config, null, [
      this.#okBtn,
      this.#declineBtn,
    ]);
  }

  async approve(config: ConfirmDialogConfig<C>): Promise<Result> {
    return this.#openDialog('approve', config, null, [
      this.#okBtnDanger,
      this.#declineBtn,
    ]);
  }

  async prompt(config: PromptDialogConfig<C>): Promise<Result<string | null>> {
    const extraContent = htmlElement(
      html`
        <label class="prompt-label">
          ${config.label?.toString() || ''}
          <input
            name="input"
            autofocus
            class="prompt-text-field"
            value="${config.value || ''}"
          />
        </label>
      `.asString()
    );

    return this.#openDialog('prompt', config, extraContent as any, [
      this.#okBtn,
      this.#declineBtn,
    ]);
  }

  async #openDialog(
    dialogType: DialogType,
    baseConfig: BaseDialogConfig<C>,
    extraContent: Renderable<C>,
    buttons: ButtonConfig[]
  ): Promise<any> {
    const targetContainer = document.body;
    const customDialogTagName = CustomDialog.prepare();

    let setResult: any;
    let setError: any;

    const resultPromise = new Promise((resolve, reject) => {
      setResult = resolve;
      setError = reject;
    });

    const finish = (id: Symbol) => {
      switch (dialogType) {
        case 'info':
        case 'success':
        case 'warn':
        case 'error':
          setResult({
            confirmed: id === DialogController.#symbolConfirm,
            declined: false,
            aborted: id === DialogController.#symbolAbort,
          });
          break;
        case 'confirm':
        case 'approve':
          setResult({
            confirmed: id === DialogController.#symbolConfirm,
            declined: id !== DialogController.#symbolConfirm,
            aborted: id === DialogController.#symbolAbort,
          });
          break;
        case 'prompt':
          setResult({
            confirmed: id === DialogController.#symbolConfirm,
            declined: id === DialogController.#symbolDecline,
            aborted: id === DialogController.#symbolAbort,
            value:
              id !== DialogController.#symbolConfirm
                ? null
                : customDialogElem.shadowRoot!.querySelector('input')!.value,
          });
          break;
      }
    };

    const onButtonClicked = async (id: Symbol) => {
      const customDialogElem = targetContainer.lastChild as CustomDialog;
      await customDialogElem.close();
      finish(id);
    };

    const customDialogElem = h(customDialogTagName, {});

    customDialogElem.addEventListener('cancel', () => {
      finish(DialogController.#symbolAbort);
    });

    if (!this.#config.renderCloseButton) {
      const closeButton = h('button', {
        className: 'close-button',
        onclick: () => onButtonClicked(DialogController.#symbolAbort),
      });

      closeButton.innerHTML = closeIcon.getSvgText();

      customDialogElem
        .shadowRoot!.querySelector('slot[name=close-button]')!
        .append(closeButton);
    }

    for (const key of [
      'title',
      'subtitle',
      'intro',
      'content',
      'outro',
    ] as const) {
      const renderable = baseConfig[key];

      if (renderable) {
        const elem = h<HTMLDivElement>('div');

        if (renderable instanceof HtmlContent) {
          elem.innerHTML = renderable.asString();
        } else {
          elem.innerText = renderable.toString();
        }

        const content = h('div', { slot: key }, elem);

        customDialogElem.append(content);
      }
    }

    if (extraContent) {
      if (this.#config.renderPromptInput) {
        // TODO
      } else {
        const extra = h('div', null, (extraContent as any) || '');
        extra.append(extraContent as any); // TODO!
        customDialogElem
          .shadowRoot!.querySelector('slot[name=extra-content]')!
          .append(extra);
      }
    }

    if (!this.#config.renderActionButton) {
      const buttonContainer =
        customDialogElem.shadowRoot!.querySelector('slot[name=button]')!;

      for (const buttonConfig of buttons) {
        const onClick = () => onButtonClicked(buttonConfig.id);

        const button = h(
          'button',
          {
            className: 'action-button',
            'data-appearance': buttonConfig.appearance,
            onclick: onClick,
          },
          buttonConfig.text
        );

        buttonContainer.append(button);
      }
    }

    targetContainer.append(customDialogElem);
    return resultPromise;
  }
}

// =================================================================
// Dialog custom element
// =================================================================

class CustomDialog extends HTMLElement {
  static readonly #tagName = 'internal-dialog-' + Date.now();

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [dialogStyles];

    const content = html`
      <dialog>
        <div class="dialog-content">
          <div class="header">
            <div id="icon"></div>
            <div class="titles">
              <slot name="title" class="title"></slot>
              <slot name="subtitle" class="subtitle"></slot>
            </div>
            <slot name="close-button"></slot>
          </div>
          <div class="body">
            <slot name="intro" class="intro"></slot>
            <slot name="content" class="content"></slot>
            <slot name="extra-content" class="extra-content"></slot>
            <slot name="outro" class="outro"></slot>
          </div>
          <div class="footer">
            <slot name="button" class="buttons"></slot>
          </div>
        </div>
      </dialog>
    `;

    const dialogElem = htmlElement<HTMLDialogElement>(content.asString());

    dialogElem.addEventListener('cancel', async (ev) => {
      ev.preventDefault();
      await this.close();
      this.dispatchEvent(new Event('cancel'));
    });

    this.shadowRoot!.append(dialogElem);
    queueMicrotask(() => this.open());
  }

  connectedCallback() {}

  open() {
    this.shadowRoot!.querySelector<HTMLDialogElement>('dialog')!.showModal();
  }

  close(): Promise<void> {
    const dialogElem =
      this.shadowRoot!.querySelector<HTMLDialogElement>('dialog')!;

    return new Promise((resolve) => {
      dialogElem.addEventListener(
        'animationend',
        (ev) => {
          if (ev.target === dialogElem) {
            const customDialogElem = (dialogElem.getRootNode() as ShadowRoot)
              .host as CustomDialog;
            dialogElem.close();
            customDialogElem.remove();
            setTimeout(resolve, 250);
          }
        },
        { once: true }
      );

      dialogElem.classList.add('closing');
    });
  }

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
  return s.length < maxLength ? s : s.substring(0, maxLength - 3) + '...';
}

function escapeHtml(s: unknown) {
  return s === null || s === undefined
    ? ''
    : String(s)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function isIterable(value: unknown): value is Iterable<unknown> {
  return (
    typeof value === 'object' && value !== null && Symbol.iterator in value
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
        ? ''
        : String(htmlText).trim();
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

function htmlElement<T = HTMLElement>(htmlText: string) {
  const elem = document.createElement('div');
  elem.innerHTML = htmlText;

  if (elem.childElementCount !== 1) {
    throw new Error('Must have exactly one root element');
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
    (result, str, i) => `${result}${str}${values[i] || ''}`,
    ''
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
      cssText === null || cssText === undefined ? '' : String(cssText);
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
    target.adoptedStyleSheets = target.adoptedStyleSheets.filter(
      (it) => it != styleSheet
    );
  };
}

// =================================================================
// Styles
// =================================================================

const theme = {
  primaryTextColor: 'white',
  primaryBackgroundColor: 'oklch(50% 0.134 242.749)',
  secondaryTextColor: 'black',
  secondaryBackgroundColor: 'white',
  secondaryBorderColor: '#b0b0b0',
  dangerTextColor: 'white',
  dangerBackgroundColor: '#BE4545FF',
  borderColor: '#eee',
  borderRadius: '4px',
  textColor: 'lightDark(black, white)',
  dialogBackgroundColor: 'lightDark(white, #333)',
  animationDuration: '0.3s',
};

const globalStyles = css``;

const dialogStyles = css`
  dialog {
    outline: none;
    position: fixed;
    top: 25%;
    transform: translateY(-50%);
    color: ${theme.textColor};
    background-color: ${theme.dialogBackgroundColor};
    border: none;
    border-radius: ${theme.borderRadius};
    outline: none;
    min-width: 23em;
    box-sizing: border-box;
    padding: 0;
    margin: 0 auto;
    user-select: none;

    &[open]:not(.closing) {
      animation: dialog-fade-in ${theme.animationDuration} ease-in-out;
    }

    &[open].closing {
      animation: dialog-fade-out ${theme.animationDuration} ease-in-out;
    }

    &[open]::backdrop {
      background-color: rgba(0, 0, 0, 0.5);
    }

    &[open]:not(.closing)::backdrop {
      animation: backdrop-fade-in ${theme.animationDuration} ease-in-out;
    }

    &[open].closing::backdrop {
      animation: backdrop-fade-out ${theme.animationDuration} ease-in-out;
    }

    .header {
      display: flex;
      align-items: flex-start;
      gap: 0.6em;
      padding: 1em 1.25em 0.125em 1.25em;
      width: 100%;
      box-sizing: border-box;

      #icon {
        display: none;
        font-size: 150%;
        align-self: center;

        .icon-info,
        .icon-success,
        .icon-confirm,
        .icon-prompt {
          color: ${theme.primaryBackgroundColor};
        }

        .icon-warn,
        .icon-error,
        .icon-approve {
          color: ${theme.dangerBackgroundColor};
        }
      }

      .titles {
        display: flex;
        flex-direction: column;
        width: 100%;
        padding: 0.25em 0 0 0;
        gap: 0.125em;

        .title {
          display: block;
          font-size: 1.1em;
          font-weight: 600;
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
      padding: 0 1.25em 0.75em 1.25em;
      min-height: 2em;

      .intro,
      .content,
      .outro {
        display: block;
      }
    }

    .footer {
      padding: 0.6em 1.25em 0.6em 1.25em;
      margin: 0;
      user-select: none;

      .buttons {
        display: flex;
        flex-direction: row-reverse;
        gap: 0.4em;
      }
    }
  }

  .dialog-content {
    font-size: 16px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
      Helvetica, Arial, sans-serif;
  }

  .prompt-label {
    display: flex;
    flex-direction: column;
    gap: 0.25em;
    font-weight: 600;
    font-size: 90%;
  }

  .prompt-text-field {
    width: 100%;
    outline: none;
    border: 1px solid #aaa;
    box-sizing: border-box;
    padding: 0.3em 0.7em;
    margin: 0.125em 0;
    font-size: 105%;
  }

  .action-button {
    outline: none;
    border: none;
    border-radius: 3px;
    padding: 0.6em 1.75em;
    cursor: pointer;

    &[data-appearance='primary'] {
      color: ${theme.primaryTextColor};
      background-color: ${theme.primaryBackgroundColor};

      &:hover {
        background-color: color-mix(
          in srgb,
          ${theme.primaryBackgroundColor},
          black 10%
        );
      }

      &:active {
        background-color: color-mix(
          in srgb,
          ${theme.primaryBackgroundColor},
          black 20%
        );
      }
    }

    &[data-appearance='secondary'] {
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

    &[data-appearance='danger'] {
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

  @keyframes dialog-fade-in {
    0% {
      top: 0;
      opacity: 0;
      transform: scale(0);
    }
    100% {
      opacity: 1;
      transform: scale(1) translateY(-50%);
    }
  }

  @keyframes dialog-fade-out {
    0% {
      opacity: 1;
      transform: scale(1) translateY(-50%);
    }
    100% {
      top: 0;
      opacity: 0;
      transform: scale(0);
    }
  }

  @keyframes backdrop-fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes backdrop-fade-out {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
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
