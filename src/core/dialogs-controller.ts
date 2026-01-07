export { h, html, DialogController };
export type { DialogAdapter };

// ===================================================================
// Types
// ===================================================================

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
  labelText?: Renderable<C>;
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

type ActionButtonType = 'primary' | 'secondary' | 'danger';

interface Result<T = null> {
  readonly confirmed: boolean;
  readonly denied: boolean;
  readonly declined: boolean;
  data: T;
}

interface ButtonConfig {
  id: Symbol;
  type: 'primary' | 'secondary' | 'danger';
  text: string;
}

interface DialogAdapter<C> {
  openDialog(params: {
    id: string;
    customDialogTagName: string;
    slotContents: [string, Renderable<C>][];
    properties: Record<string, unknown>;
    cancel(): void;
  }): {
    closeDialog: () => Promise<void>;
  };

  renderCloseButton?(text: string, onClick: () => void): Renderable<C>;

  renderActionButton?(type: ActionButtonType, text: string, onClick: () => void): Renderable<C>;

  renderPromptInput?(labelText: string, value: string): Renderable<C>;
}

// ===================================================================
// Constants
// ===================================================================

const symbolAbort = Symbol('close');
const symbolConfirm = Symbol('confirm');
const symbolDecline = Symbol('decline');

// ===================================================================
// DialogController
// ===================================================================

class DialogController<C> implements Ctrl<C> {
  readonly #adapter: DialogAdapter<C>;

  readonly #okBtn: ButtonConfig = {
    id: symbolConfirm,
    type: 'primary',
    text: 'Ok',
  };

  readonly #okBtnDanger: ButtonConfig = {
    id: symbolConfirm,
    type: 'danger',
    text: 'Ok',
  };

  readonly #declineBtn: ButtonConfig = {
    id: symbolDecline,
    type: 'secondary',
    text: 'Cancel',
  };

  constructor(config?: DialogAdapter<C>) {
    this.#adapter = config || (defaultDialogAdapter as any);
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
    return this.#openDialog('confirm', config, null, [this.#okBtn, this.#declineBtn]);
  }

  async approve(config: ConfirmDialogConfig<C>): Promise<Result> {
    return this.#openDialog('approve', config, null, [this.#okBtnDanger, this.#declineBtn]);
  }

  async prompt(config: PromptDialogConfig<C>): Promise<Result<string | null>> {
    return this.#openDialog(
      'prompt',
      config,
      {
        labelText: config.labelText,
        value: config.value,
      },
      [this.#okBtn, this.#declineBtn]
    );
  }

  async #openDialog(
    dialogType: DialogType,
    baseConfig: BaseDialogConfig<C>,
    extraContent: Record<string, unknown> | null,
    buttons: ButtonConfig[]
  ): Promise<any> {
    const customDialogTagName = CustomDialogElement.prepare();

    let setResult: any;

    const resultPromise = new Promise((resolve) => {
      setResult = resolve;
    });

    const finish = (id: Symbol) => {
      switch (dialogType) {
        case 'info':
        case 'success':
        case 'warn':
        case 'error':
          setResult({
            confirmed: id === symbolConfirm,
            declined: false,
            aborted: id === symbolAbort,
          });
          break;
        case 'confirm':
        case 'approve':
          setResult({
            confirmed: id === symbolConfirm,
            declined: id !== symbolConfirm,
            aborted: id === symbolAbort,
          });
          break;
        case 'prompt':
          setResult({
            confirmed: id === symbolConfirm,
            declined: id === symbolDecline,
            aborted: id === symbolAbort,
            value: id === symbolConfirm ? '// TODO' : null,
          });
          break;
      }
    };

    const onButtonClicked = async (id: Symbol) => {
      await closeDialog();
      finish(id);
    };

    const cancel = async (id: Symbol) => {
      await closeDialog();
      finish(symbolAbort);
    };

    const slotContents: any = [];
    const internalSlotContents: any = [];

    for (const slot of ['title', 'subtitle', 'intro', 'content', 'outro']) {
      slotContents.push([slot, (baseConfig as any)[slot]]);
    }

    const closeButton = (
      this.#adapter.renderCloseButton || this.#renderDefaultCloseButton.bind(this)
    )('Close', () => onButtonClicked(symbolAbort));

    if (this.#adapter.renderCloseButton) {
      slotContents.push(['close-button', closeButton]);
    } else {
      internalSlotContents.push(['close-button', closeButton]);
    }

    for (const buttonConfig of buttons) {
      const actionButton = (
        this.#adapter.renderActionButton || this.#renderDefaultActionButton.bind(this)
      )(buttonConfig.type, buttonConfig.text, () => onButtonClicked(buttonConfig.id));

      if (this.#adapter.renderActionButton) {
        slotContents.push(['action-button', actionButton]);
      } else {
        internalSlotContents.push(['action-button', actionButton]);
      }
    }

    if (dialogType === 'prompt') {
      const promptInput = (this.#adapter.renderPromptInput || this.#renderDefaultPromptInput)(
        (extraContent as any).labelText,
        (extraContent as any).value
      );

      if (this.#adapter.renderPromptInput) {
        slotContents.push(['extra-content', promptInput]);
      } else {
        internalSlotContents.push(['extra-content', promptInput]);
      }
    }

    const init = (conatainer: HTMLElement) => {
      for (const [slotName, slotContent] of internalSlotContents) {
        conatainer.querySelector(`slot[name=${slotName}]`)!.appendChild(toNode(slotContent));
      }
    };

    const { closeDialog } = this.#adapter.openDialog({
      id: 'dlg-' + Date.now(),
      customDialogTagName,
      properties: { init },
      slotContents: slotContents,
      cancel: () => {}, // todo!!!!!!!
    });

    return resultPromise;
  }

  #renderDefaultCloseButton(text: string, onClick: () => void) {
    const closeButton = h('button', {
      className: 'close-button',
      onclick: onClick,
    });

    closeButton.innerHTML = closeIcon.getSvgText();
    return closeButton;
  }

  #renderDefaultActionButton(type: ActionButtonType, text: string, onClick: () => {}) {
    return h(
      'button',
      {
        className: 'action-button',
        'data-type': type,
        onclick: onClick,
      },
      text
    );
  }

  #renderDefaultPromptInput(labelText: string, value: string) {
    return toHtmlElement(
      html`
        <label class="prompt-label">
          ${labelText?.toString() || ''}
          <input name="input" autofocus class="prompt-text-field" value="${value || ''}" />
        </label>
      `.asString()
    );
  }
}

// =================================================================
// Default dialog adapter
// =================================================================

const defaultDialogAdapter: DialogAdapter<HTMLElement> = {
  openDialog({
    //id,
    customDialogTagName,
    slotContents,
    properties,
    cancel,
  }) {
    const targetContainer = document.body;
    const customDialogElem: CustomDialogElement = h(customDialogTagName, properties);
    targetContainer.append(customDialogElem);

    customDialogElem.addEventListener('cancel', () => {
      cancel();
    });

    for (const [slotName, slotContent] of slotContents) {
      const elem = convertToNodes(slotContent);
      customDialogElem.shadowRoot!.querySelector(`slot[name="${slotName}"]`)!.append(elem);
    }

    document.body.append(customDialogElem);

    return {
      closeDialog: () => customDialogElem.close(),
    };
  },
};

function convertToNodes(content: Renderable<HTMLElement>) {
  if (content === undefined || content === null) {
    return document.createTextNode('');
  }

  if (typeof content === 'string') {
    const lines = content.split(/\r?\n/);

    return lines.length === 1
      ? document.createTextNode(lines[0])
      : h('span', null, ...lines.map((line) => h('div', null, line)));
  }

  return toNode(content);
}

// =================================================================
// Dialog custom element
// =================================================================

class CustomDialogElement extends HTMLElement {
  static readonly #tagName = 'internal-dialog-' + Date.now();
  #initialized = false;

  useNativeDialog = true;
  init: (elem: HTMLElement) => void = () => {};

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [dialogStyles];
  }

  #init() {
    const content = html`
      <${this.useNativeDialog ? 'dialog' : 'div'}>
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
            <div class="action-buttons">
              <slot name="action-button"></slot>
            </div>
          </div>
        </div>
      </${this.useNativeDialog ? 'dialog' : 'div'}>
    `;

    const dialogElem = toHtmlElement<HTMLDialogElement>(content.asString());

    dialogElem.addEventListener('cancel', async (ev) => {
      ev.preventDefault();
      await this.close();
      this.dispatchEvent(new Event('cancel'));
    });

    this.init(dialogElem);
    this.shadowRoot!.append(dialogElem);
  }

  connectedCallback() {
    if (this.#initialized) {
      return;
    }

    this.#init();
    this.#initialized = true;

    if (this.useNativeDialog) {
      queueMicrotask(() => this.#open());
    }
  }

  #open() {
    this.shadowRoot!.querySelector<HTMLDialogElement>('dialog')!.showModal();
  }

  close(): Promise<void> {
    const dialogElem = this.shadowRoot!.querySelector<HTMLDialogElement>('dialog')!;

    return new Promise((resolve) => {
      dialogElem.addEventListener(
        'animationend',
        (ev) => {
          if (ev.target === dialogElem) {
            const customDialogElem = (dialogElem.getRootNode() as ShadowRoot)
              .host as CustomDialogElement;
            dialogElem.close();
            customDialogElem.remove();
            setTimeout(resolve, 100);
          }
        },
        { once: true }
      );

      dialogElem.classList.add('closing');
    });
  }

  static prepare(): string {
    if (!customElements.get(CustomDialogElement.#tagName)) {
      customElements.define(CustomDialogElement.#tagName, CustomDialogElement);
    }

    document.adoptedStyleSheets = [...document.adoptedStyleSheets, globalStyles.asStyleSheet()];

    return CustomDialogElement.#tagName;
  }
}

// =================================================================
// Utilities
// =================================================================

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
  return typeof value === 'object' && value !== null && Symbol.iterator in value;
}

// =================================================================
// HTML
// =================================================================

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

function toHtmlElement<T = HTMLElement>(htmlText: string) {
  const elem = document.createElement('div');
  elem.innerHTML = htmlText;

  if (elem.childElementCount !== 1) {
    throw new Error('Must have exactly one root element');
  }

  return elem.firstElementChild as T;
}

function toNode(content: Node | string | number | HtmlContent | null | undefined): Node {
  if (content === null || content === undefined) {
    return document.createTextNode('');
  } else if (content instanceof Node) {
    return content;
  } else if (typeof content === 'number') {
    return document.createTextNode(content.toString());
  } else if (content instanceof HtmlContent) {
    return toHtmlElement(content.asString());
  }

  return document.createTextNode(content);
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
  const text = strings.reduce((result, str, i) => `${result}${str}${values[i] || ''}`, '');

  return new SvgContent(text);
}

// =================================================================
// CSS
// =================================================================

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
  }

  .dialog-content {
    user-select: none;
    font-size: 16px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;

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

      .action-buttons {
        display: flex;
        flex-direction: row-reverse;
        gap: 0.4em;
      }
    }
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

    &[data-type='primary'] {
      color: ${theme.primaryTextColor};
      background-color: ${theme.primaryBackgroundColor};

      &:hover {
        background-color: color-mix(in srgb, ${theme.primaryBackgroundColor}, black 10%);
      }

      &:active {
        background-color: color-mix(in srgb, ${theme.primaryBackgroundColor}, black 20%);
      }
    }

    &[data-type='secondary'] {
      color: ${theme.secondaryTextColor};
      background-color: ${theme.secondaryBackgroundColor};
      border: 1px solid ${theme.secondaryBorderColor};

      &:hover {
        background-color: color-mix(in srgb, ${theme.secondaryBackgroundColor}, black 5%);
      }

      &:active {
        background-color: color-mix(in srgb, ${theme.secondaryBackgroundColor}, black 10%);
      }
    }

    &[data-type='danger'] {
      color: ${theme.dangerTextColor};
      background-color: ${theme.dangerBackgroundColor};

      &:hover {
        background-color: color-mix(in srgb, ${theme.dangerBackgroundColor}, black 15%);
      }

      &:active {
        background-color: color-mix(in srgb, ${theme.dangerBackgroundColor}, black 40%);
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
