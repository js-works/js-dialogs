export { h, html, svg, DialogController };
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

  buttonTexts?: {
    confirm?: string;
    cancel?: string;
  };
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
  openDialog?(params: {
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

  getDialogIcon?(dialogType: DialogType, defaultIcon: SvgContent): SvgContent | null;
}

// ===================================================================
// Constants
// ===================================================================

const symbolCancel = Symbol('close');
const symbolConfirm = Symbol('confirm');
const symbolDecline = Symbol('decline');

// ===================================================================
// DialogController
// ===================================================================

class DialogController<C> implements Ctrl<C> {
  readonly #adapter: DialogAdapter<C>;

  readonly #confirmBtn: ButtonConfig = {
    id: symbolConfirm,
    type: 'primary',
    text: 'Ok',
  };

  readonly #okBtnDanger: ButtonConfig = {
    id: symbolConfirm,
    type: 'danger',
    text: 'Ok',
  };

  readonly #cancelBtn: ButtonConfig = {
    id: symbolDecline,
    type: 'secondary',
    text: 'Cancel',
  };

  constructor(adapter?: DialogAdapter<C>) {
    if (adapter) {
      const customAdapter: DialogAdapter<C> = {
        ...(defaultDialogAdapter as any),
      };

      for (const prop of Object.keys(adapter)) {
        if (typeof (adapter as any)[prop] === 'function') {
          (customAdapter as any)[prop] = (adapter as any)[prop].bind(adapter);
        }
      }

      this.#adapter = customAdapter;
    } else {
      this.#adapter = defaultDialogAdapter as DialogAdapter<any>;
    }
  }

  async info(config: MessageDialogConfig<C>): Promise<Result> {
    return this.#openDialog('info', config, null, [this.#confirmBtn]);
  }

  async success(config: MessageDialogConfig<C>): Promise<Result> {
    return this.#openDialog('success', config, null, [this.#confirmBtn]);
  }

  async warn(config: MessageDialogConfig<C>): Promise<Result> {
    return this.#openDialog('warn', config, null, [this.#okBtnDanger]);
  }

  async error(config: MessageDialogConfig<C>): Promise<Result> {
    return this.#openDialog('error', config, null, [this.#okBtnDanger]);
  }

  async confirm(config: ConfirmDialogConfig<C>): Promise<Result> {
    return this.#openDialog('confirm', config, null, [this.#confirmBtn, this.#cancelBtn]);
  }

  async approve(config: ConfirmDialogConfig<C>): Promise<Result> {
    return this.#openDialog('approve', config, null, [this.#okBtnDanger, this.#cancelBtn]);
  }

  async prompt(config: PromptDialogConfig<C>): Promise<Result<string | null>> {
    return this.#openDialog(
      'prompt',
      config,
      {
        labelText: config.labelText,
        value: config.value,
      },
      [this.#confirmBtn, this.#cancelBtn]
    );
  }

  async #openDialog(
    dialogType: DialogType,
    baseConfig: BaseDialogConfig<C>,
    extraContent: Record<string, unknown> | null,
    buttons: ButtonConfig[]
  ): Promise<any> {
    const buttonTexts = baseConfig.buttonTexts || null;

    if (buttonTexts) {
      buttons = [...buttons];
      for (let i = 0; i < buttons.length; ++i) {
        const buttonConfig = { ...buttons[i] };
        buttons[i] = buttonConfig;

        if (buttonConfig.id === symbolConfirm && buttonTexts.confirm) {
          buttonConfig.text = buttonTexts.confirm;
        } else if (buttonConfig.id === symbolCancel && buttonTexts.cancel) {
          buttonConfig.text = buttonTexts.cancel;
        }
      }
    }

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
            aborted: id === symbolCancel,
          });
          break;
        case 'confirm':
        case 'approve':
          setResult({
            confirmed: id === symbolConfirm,
            declined: id !== symbolConfirm,
            aborted: id === symbolCancel,
          });
          break;
        case 'prompt':
          setResult({
            confirmed: id === symbolConfirm,
            declined: id === symbolDecline,
            aborted: id === symbolCancel,
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
      finish(symbolCancel);
    };

    const slotContents: any = [];
    const internalSlotContents: any = [];

    const icon = this.#adapter.getDialogIcon
      ? this.#adapter.getDialogIcon(dialogType, this.#getDefaultDialogIcon(dialogType)) || null
      : this.#getDefaultDialogIcon(dialogType);

    if (icon) {
      internalSlotContents.push(['dialog-icon', html.raw(icon.getSvgText())]);
    }

    for (const slot of ['title', 'subtitle', 'intro', 'content', 'outro']) {
      slotContents.push([slot, (baseConfig as any)[slot]]);
    }

    const closeButton = (
      this.#adapter.renderCloseButton || this.#renderDefaultCloseButton.bind(this)
    )('Close', () => onButtonClicked(symbolCancel));

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

    const { closeDialog } = this.#adapter.openDialog!({
      id: 'dlg-' + Date.now(),
      customDialogTagName,
      properties: { 'data-dialog-type': dialogType, init },
      slotContents: slotContents,
      cancel: () => {}, // todo!!!!!!!
    });

    return resultPromise;
  }

  #getDefaultDialogIcon(dialogType: DialogType) {
    switch (dialogType) {
      case 'info':
        return infoIcon;
      case 'success':
        return successIcon;
      case 'warn':
        return warnIcon;
      case 'error':
        return errorIcon;
      case 'approve':
        return approveIcon;
      case 'confirm':
        return confirmIcon;
      case 'prompt':
        return promptIcon;
      default:
        throw new Error('Illegal dialog type: ' + dialogType);
    }
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
          <input
            name="input"
            autofocus
            autocomplete="off"
            class="prompt-text-field"
            value=${value || ''}
          />
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
            <div id="icon">
              <slot name="dialog-icon"></slot>
            </div>
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
  dialogBorderRadius: '6px',
  closeButtonBorderRadius: '100%',
  actionButtonBorderRadius: '3px',
  textColor: 'lightDark(black, white)',
  dialogBackgroundColor: 'lightDark(white, #333)',
  animationDuration: '0.25s',
};

const globalStyles = css``;

const dialogStyles = css`
  dialog {
    outline: none;
    position: fixed;
    top: 18%;
    transform: translateY(-50%);
    color: ${theme.textColor};
    background-color: ${theme.dialogBackgroundColor};
    border: none;
    border-radius: ${theme.dialogBorderRadius};
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

  #icon {
    display: flex;
    justify-content: center;
    align-items: center;
    align-self: center;
    aspect-ratio: 1 / 1;
    border-radius: 50%;
    font-size: 150%;
    padding: 0.25em;
  }

  :host([data-dialog-type='info']) #icon,
  :host([data-dialog-type='success']) #icon,
  :host([data-dialog-type='confirm']) #icon,
  :host([data-dialog-type='prompt']) #icon {
    color: ${theme.primaryBackgroundColor};
    background-color: color-mix(in srgb, ${theme.primaryBackgroundColor}, white 87%);
  }

  :host([data-dialog-type='warn']) #icon,
  :host([data-dialog-type='error']) #icon,
  :host([data-dialog-type='approve']) #icon {
    color: ${theme.dangerBackgroundColor};
    background-color: color-mix(in srgb, ${theme.dangerBackgroundColor}, white 87%);
  }

  #icon:is(:has(> slot:empty)) {
    display: none;
  }

  .dialog-content {
    user-select: none;
    font-size: 16px;
    font-family:
      -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;

    .header {
      display: flex;
      align-items: center;
      gap: 0.5em;
      padding: 1em 1.25em 0.4em 1.25em;
      width: 100%;
      box-sizing: border-box;

      .titles {
        display: flex;
        flex-direction: column;
        width: 100%;
        padding: 0.25em 0 0 0;

        .title {
          display: block;
          font-size: 1.1em;
          font-weight: 600;
        }

        .subtitle {
          display: block;
          font-size: 0.85em;
          line-height: 0.85em;
          padding: 0 1px;
        }
      }
    }

    .body {
      display: flex;
      flex-direction: column;
      gap: 0.5em;
      padding: 0 1.25em 0.75em 1.25em;
      min-height: 2em;
      line-height: 1.25em;

      .intro,
      .content,
      .outro {
        display: block;
      }
    }

    .footer {
      padding: 0.75em;
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
    border-radius: ${theme.actionButtonBorderRadius};
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
    align-self: flex-start;
    border: none;
    border-radius: ${theme.closeButtonBorderRadius};
    outline: none;
    padding: 0.3em;
    margin: 0;
    font-size: 1em;
    line-height: 0;
    background-color: transparent;
    cursor: pointer;
    padding: 0.3em;

    &:hover {
      background-color: light-dark(
        color-mix(in srgb, white, black 7%),
        color-mix(in srgb, black, white 7%)
      );
    }

    &:active {
      background-color: light-dark(
        color-mix(in srgb, #f0f0f0, black 10%),
        color-mix(in srgb, #f0f0f0, white 10%)
      );
    }
  }

  @keyframes dialog-fade-in {
    0% {
      top: 10%;
      opacity: 0;
    }
    100% {
      opacity: 1;
      transform: translateY(-50%);
    }
  }

  @keyframes dialog-fade-out {
    0% {
      opacity: 1;
      transform: translateY(-50%);
    }
    100% {
      top: 10%;
      opacity: 0;
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
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
      <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"/>
    </svg>
  `;

const infoIcon = svg`
  <svg xmlns="http://www.w3.org/2000/svg" width="0.8em" height="0.8em" fill="currentColor" class="bi bi-info-square" viewBox="0 0 16 16">
    <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z"/>
    <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0"/>
  </svg>
`;

const successIcon = svg`
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
    <path d="M3 14.5A1.5 1.5 0 0 1 1.5 13V3A1.5 1.5 0 0 1 3 1.5h8a.5.5 0 0 1 0 1H3a.5.5 0 0 0-.5.5v10a.5.5 0 0 0 .5.5h10a.5.5 0 0 0 .5-.5V8a.5.5 0 0 1 1 0v5a1.5 1.5 0 0 1-1.5 1.5z"/>
    <path d="m8.354 10.354 7-7a.5.5 0 0 0-.708-.708L8 9.293 5.354 6.646a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0"/>
  </svg>

`;

const warnIcon = svg`
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox = "0 0 16 16">
    <path d="M4.54.146A.5.5 0 0 1 4.893 0h6.214a.5.5 0 0 1 .353.146l4.394 4.394a.5.5 0 0 1 .146.353v6.214a.5.5 0 0 1-.146.353l-4.394 4.394a.5.5 0 0 1-.353.146H4.893a.5.5 0 0 1-.353-.146L.146 11.46A.5.5 0 0 1 0 11.107V4.893a.5.5 0 0 1 .146-.353zM5.1 1 1 5.1v5.8L5.1 15h5.8l4.1-4.1V5.1L10.9 1z"/>
    <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z"/>
  </svg>
`;

const errorIcon = svg`
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" class="bi bi-exclamation-diamond" viewBox="0 0 16 16">
    <path d="M6.95.435c.58-.58 1.52-.58 2.1 0l6.515 6.516c.58.58.58 1.519 0 2.098L9.05 15.565c-.58.58-1.519.58-2.098 0L.435 9.05a1.48 1.48 0 0 1 0-2.098zm1.4.7a.495.495 0 0 0-.7 0L1.134 7.65a.495.495 0 0 0 0 .7l6.516 6.516a.495.495 0 0 0 .7 0l6.516-6.516a.495.495 0 0 0 0-.7L8.35 1.134z"/>
    <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z"/>
  </svg>
`;

const confirmIcon = svg`
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" class="bi bi-question-diamond" viewBox="0 0 16 16">
    <path d="M6.95.435c.58-.58 1.52-.58 2.1 0l6.515 6.516c.58.58.58 1.519 0 2.098L9.05 15.565c-.58.58-1.519.58-2.098 0L.435 9.05a1.48 1.48 0 0 1 0-2.098zm1.4.7a.495.495 0 0 0-.7 0L1.134 7.65a.495.495 0 0 0 0 .7l6.516 6.516a.495.495 0 0 0 .7 0l6.516-6.516a.495.495 0 0 0 0-.7L8.35 1.134z"/>
    <path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286m1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94"/>
  </svg>
`;

const approveIcon = svg`
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" class="bi bi-question-diamond" viewBox="0 0 16 16">
    <path d="M6.95.435c.58-.58 1.52-.58 2.1 0l6.515 6.516c.58.58.58 1.519 0 2.098L9.05 15.565c-.58.58-1.519.58-2.098 0L.435 9.05a1.48 1.48 0 0 1 0-2.098zm1.4.7a.495.495 0 0 0-.7 0L1.134 7.65a.495.495 0 0 0 0 .7l6.516 6.516a.495.495 0 0 0 .7 0l6.516-6.516a.495.495 0 0 0 0-.7L8.35 1.134z"/>
    <path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286m1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94"/>
  </svg>
`;

const promptIcon = svg`
  <svg width="1em" height="1em" viewBox="0 0 24 25" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M6.44141 7.95293C5.99958 7.95293 5.64141 8.3111 5.64141 8.75293C5.64141 9.19476 5.99958 9.55293 6.44141 9.55293H6.45141C6.89323 9.55293 7.25141 9.19476 7.25141 8.75293C7.25141 8.3111 6.89323 7.95293 6.45141 7.95293H6.44141Z"/>
    <path d="M5.63945 12.1279C5.63945 11.6861 5.99763 11.3279 6.43945 11.3279H6.44945C6.89128 11.3279 7.24945 11.6861 7.24945 12.1279C7.24945 12.5698 6.89128 12.9279 6.44945 12.9279H6.43945C5.99763 12.9279 5.63945 12.5698 5.63945 12.1279Z"/>
    <path d="M10.1445 7.95293C9.7027 7.95293 9.34453 8.3111 9.34453 8.75293C9.34453 9.19476 9.7027 9.55293 10.1445 9.55293H10.1545C10.5964 9.55293 10.9545 9.19476 10.9545 8.75293C10.9545 8.3111 10.5964 7.95293 10.1545 7.95293H10.1445Z"/>
    <path d="M9.3582 12.1279C9.3582 11.6861 9.71638 11.3279 10.1582 11.3279H10.1682C10.61 11.3279 10.9682 11.6861 10.9682 12.1279C10.9682 12.5698 10.61 12.9279 10.1682 12.9279H10.1582C9.71638 12.9279 9.3582 12.5698 9.3582 12.1279Z"/>
    <path d="M8 14.7529C7.58579 14.7529 7.25 15.0887 7.25 15.5029C7.25 15.9171 7.58579 16.2529 8 16.2529H16C16.4142 16.2529 16.75 15.9171 16.75 15.5029C16.75 15.0887 16.4142 14.7529 16 14.7529H8Z"/>
    <path d="M13.0457 8.75293C13.0457 8.3111 13.4039 7.95293 13.8457 7.95293H13.8557C14.2975 7.95293 14.6557 8.3111 14.6557 8.75293C14.6557 9.19476 14.2975 9.55293 13.8557 9.55293H13.8457C13.4039 9.55293 13.0457 9.19476 13.0457 8.75293Z"/>
    <path d="M17.5479 7.95293C17.106 7.95293 16.7479 8.3111 16.7479 8.75293C16.7479 9.19476 17.106 9.55293 17.5479 9.55293H17.5579C17.9997 9.55293 18.3579 9.19476 18.3579 8.75293C18.3579 8.3111 17.9997 7.95293 17.5579 7.95293H17.5479Z"/>
    <path d="M13.0369 12.1279C13.0369 11.6861 13.3951 11.3279 13.8369 11.3279H13.8469C14.2887 11.3279 14.6469 11.6861 14.6469 12.1279C14.6469 12.5698 14.2887 12.9279 13.8469 12.9279H13.8369C13.3951 12.9279 13.0369 12.5698 13.0369 12.1279Z"/>
    <path d="M17.5557 11.3279C17.1138 11.3279 16.7557 11.6861 16.7557 12.1279C16.7557 12.5698 17.1138 12.9279 17.5557 12.9279H17.5657C18.0075 12.9279 18.3657 12.5698 18.3657 12.1279C18.3657 11.6861 18.0075 11.3279 17.5657 11.3279H17.5557Z"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M4.25 4.62793C3.00736 4.62793 2 5.63529 2 6.87793V17.3779C2 18.6206 3.00736 19.6279 4.25 19.6279H19.7501C20.9927 19.6279 22.0001 18.6206 22.0001 17.3779V6.87793C22.0001 5.63529 20.9927 4.62793 19.7501 4.62793H4.25ZM3.5 6.87793C3.5 6.46372 3.83579 6.12793 4.25 6.12793H19.7501C20.1643 6.12793 20.5001 6.46372 20.5001 6.87793V17.3779C20.5001 17.7921 20.1643 18.1279 19.7501 18.1279H4.25C3.83579 18.1279 3.5 17.7921 3.5 17.3779V6.87793Z"/>
  </svg>
`;
