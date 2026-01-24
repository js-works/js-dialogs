import { toNode } from "./dom.js"
import { h, html, toHtmlElement, HtmlContent } from "./html.js"
import { css, CssContent } from "./css.js"
import { svg, SvgContent } from "./svg.js"
import { approveIcon, confirmIcon, errorIcon, infoIcon, promptIcon, successIcon, warnIcon } from "./default-icons.js";

import { dialogStyles } from "./dialog.styles.js";

export { css, h, html, svg, DialogController };
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

interface InputDialogConfig<C> extends BaseDialogConfig<C> {}

interface Ctrl<C> {
  info(config: MessageDialogConfig<C>): Promise<Result>;
  success(config: MessageDialogConfig<C>): Promise<Result>;
  warn(config: MessageDialogConfig<C>): Promise<Result>;
  error(config: MessageDialogConfig<C>): Promise<Result>;
  confirm(config: ConfirmDialogConfig<C>): Promise<Result>;
  approve(config: ConfirmDialogConfig<C>): Promise<Result>;
  prompt(config: PromptDialogConfig<C>): Promise<Result<string | null>>;
  input(config: InputDialogConfig<C>): Promise<Result>;
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

  getDialogIcon?(dialogType: DialogType, defaultIcon: SvgContent | null): SvgContent | null;

  getStyles?(tagName: string): CssContent;
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
  #initialized = false;

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
    id: symbolCancel,
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

  async input(config: ConfirmDialogConfig<C>): Promise<Result> {
    return this.#openDialog('input', config, null, [this.#okBtnDanger, this.#cancelBtn]);
  }

  async #openDialog(
    dialogType: DialogType,
    baseConfig: BaseDialogConfig<C>,
    extraContent: Record<string, unknown> | null,
    buttons: ButtonConfig[]
  ): Promise<any> {
    const customDialogTagName = CustomDialogElement.prepare();

    if (!this.#initialized) {
      this.#initialize(customDialogTagName);
    }

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

  #initialize(tagName: string) {
    const styles = this.#adapter.getStyles?.(tagName) || null;
    console.log(tagName);

    if (styles) {
      const styleSheet = new CSSStyleSheet();
      styleSheet.replaceSync(styles.getCssText());
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, styleSheet];
    }

    this.#initialized = true;
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
        return null;
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
      const nodes = convertToNodes(slotContent);
      customDialogElem.shadowRoot!.querySelector(`slot[name="${slotName}"]`)!.append(...nodes);
    }

    document.body.append(customDialogElem);

    return {
      closeDialog: () => customDialogElem.close(),
    };
  },
};

function convertToNodes(content: Renderable<HTMLElement>): Node[] {
  if (content === undefined || content === null) {
    return [document.createTextNode('')];
  } else if (typeof content === 'string') {
    const lines = content.split(/\r?\n/);

    return lines.length === 1
      ? [document.createTextNode(lines[0])]
      : [h('span', null, ...lines.map((line) => h('div', null, line)))];
  } else if (typeof content === 'number') {
    return [document.createTextNode(content.toString())];
  } else if (content instanceof HtmlContent) {
    return [toHtmlElement((content as HtmlContent).asString())];
  }

  return [content];
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

    return CustomDialogElement.#tagName;
  }
}


const closeIcon = svg`
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
      <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"/>
    </svg>
  `;
