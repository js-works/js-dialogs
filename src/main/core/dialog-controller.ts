import { toNode } from './dom.js';
import { h, html, toHtmlElement, HtmlContent } from './html.js';
import { css } from './css.js';
import { svg } from './svg.js';

import type {
  ActionButtonType,
  DialogAdapter,
  DialogControllerConfig,
  DialogType,
  Plugin,
  Renderable,
} from './types.js';

import { dialogStyles } from './dialog.styles.js';
import { createToggle, type Toggle } from './toggles.js';
import { isResultObject, type Result } from './result.js';
import { runWithOverlay, showOverlay } from './overlay.js';

export { createDialogsController, css, h, html, svg, type DialogsController };

// ===================================================================
// Types
// ===================================================================

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
interface InputDialogConfig<C> extends BaseDialogConfig<C> {}

interface DialogsFunctions<C> {
  info(config: MessageDialogConfig<C>): Promise<InfoDialogResult>;
  success(config: MessageDialogConfig<C>): Promise<SuccessDialogResult>;
  warn(config: MessageDialogConfig<C>): Promise<WarnDialogResult>;
  error(config: MessageDialogConfig<C>): Promise<ErrorDialogResult>;
  confirm(config: ConfirmDialogConfig<C>): Promise<ConfirmDialogResult>;
  confirmCritical(config: ConfirmDialogConfig<C>): Promise<ConfirmCriticalDialogResult>;
  input(config: InputDialogConfig<C>): Promise<InputDialogResult>;
}

interface DialogsController<C> extends DialogsFunctions<C> {
  exec<T>(action: (scope: DialogScope<C>) => Promise<T>): Promise<T>;
}

interface DialogScope<C> extends DialogsFunctions<C> {}

type DialogResult<A extends string, T = null> =
  | {
      canceled: false;
      action: A;
      data: T;
    }
  | {
      canceled: true;
      aborted: boolean;
    };

type InfoDialogResult = DialogResult<'ok', void>;
type SuccessDialogResult = DialogResult<'ok', void>;
type WarnDialogResult = DialogResult<'ok', void>;
type ErrorDialogResult = DialogResult<'ok', void>;
type ConfirmDialogResult = DialogResult<'confirm', boolean>;
type ConfirmCriticalDialogResult = DialogResult<'confirm', boolean>;
type InputDialogResult = DialogResult<'confirm', FormData>;

interface ButtonConfig {
  id: Symbol;
  type: 'primary' | 'secondary' | 'danger';
  text: string;
}

// ===================================================================
// Constants
// ===================================================================

const symbolCancel = Symbol('cancel');
const symbolConfirm = Symbol('confirm');
const symbolDecline = Symbol('decline');

// ===================================================================
// DialogController
// ===================================================================

function createDialogsController(params?: { plugins?: Plugin[] }): DialogsController<Node>;

function createDialogsController<C>(params: {
  adapter: DialogAdapter<C>;
  plugins?: Plugin[];
}): DialogsController<C>;

function createDialogsController(params?: any): DialogsController<any> {
  const adapter = params?.adapter || defaultDialogAdapter;

  let mappedConfig: DialogControllerConfig = params?.config || {};
  const plugins = params?.plugins || [];

  for (const plugin of plugins) {
    if (plugin.mapDialogControllerConfig)
      mappedConfig = { ...mappedConfig, ...plugin.mapDialogControllerConfig(mappedConfig) };
  }

  return new DefaultDialogsController(mappedConfig, adapter);
}

class DefaultDialogsController<C> implements DialogsController<C> {
  readonly #config: DialogControllerConfig;
  readonly #adapter: DialogAdapter<C>;

  constructor(config: DialogControllerConfig, adapter?: DialogAdapter<C>) {
    this.#config = config;

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

  async exec<T>(action: (scope: DialogScope<C>) => Promise<T>): Promise<T> {
    const closeOverlay = showOverlay();

    const abortController = new AbortController();
    const scope = new DefaultDialogScope(
      () => closeOverlay(true),
      abortController.signal,
      this.#config,
      this.#adapter
    );

    try {
      return await action(scope);
    } finally {
      abortController.abort();
    }
  }

  info(config: MessageDialogConfig<C>): Promise<InfoDialogResult> {
    const scope = new DefaultDialogScope(null, null, this.#config, this.#adapter);
    return scope.info(config);
  }

  success(config: MessageDialogConfig<C>): Promise<InfoDialogResult> {
    const scope = new DefaultDialogScope(null, null, this.#config, this.#adapter);
    return scope.success(config);
  }

  warn(config: MessageDialogConfig<C>): Promise<WarnDialogResult> {
    const scope = new DefaultDialogScope(null, null, this.#config, this.#adapter);
    return scope.warn(config);
  }

  error(config: MessageDialogConfig<C>): Promise<ErrorDialogResult> {
    const scope = new DefaultDialogScope(null, null, this.#config, this.#adapter);
    return scope.error(config);
  }

  confirm(config: ConfirmDialogConfig<C>): Promise<ConfirmDialogResult> {
    const scope = new DefaultDialogScope(null, null, this.#config, this.#adapter);
    return scope.confirm(config);
  }

  confirmCritical(config: ConfirmDialogConfig<C>): Promise<ConfirmCriticalDialogResult> {
    const scope = new DefaultDialogScope(null, null, this.#config, this.#adapter);
    return scope.confirmCritical(config);
  }

  input(config: InputDialogConfig<C>): Promise<InputDialogResult> {
    const scope = new DefaultDialogScope(null, null, this.#config, this.#adapter);
    return scope.input(config);
  }
}

class DefaultDialogScope<C> implements DialogScope<C> {
  readonly #config: DialogControllerConfig;
  readonly #adapter: DialogAdapter<C>;
  #initialized = false;
  #closePrevious: (() => Promise<void>) | null = null;
  #autoCloseDialogs: boolean;

  #timeout: any = null;

  readonly #confirmBtn: ButtonConfig = {
    id: symbolConfirm,
    type: 'primary',
    text: 'Ok',
  };

  readonly #confirmBtnDanger: ButtonConfig = {
    id: symbolConfirm,
    type: 'danger',
    text: 'Ok',
  };

  readonly #cancelBtn: ButtonConfig = {
    id: symbolCancel,
    type: 'secondary',
    text: 'Cancel',
  };

  constructor(
    closeOverlay: (() => Promise<void>) | null,
    abortSignal: AbortSignal | null,
    config: DialogControllerConfig,
    adapter: DialogAdapter<C>
  ) {
    this.#autoCloseDialogs = !closeOverlay;
    this.#config = config;
    this.#adapter = adapter;
    this.#closePrevious = closeOverlay;

    abortSignal?.addEventListener('abort', async () => {
      if (this.#closePrevious) {
        try {
          await this.#closePrevious();
        } finally {
          this.#closePrevious = null;
        }
      }
    });
  }

  async info(config: MessageDialogConfig<C>): Promise<InfoDialogResult> {
    if (this.#closePrevious) {
      await this.#closePrevious();
    }
    return this.#openDialog('info', config, null, [this.#confirmBtn]);
  }

  async #prepare() {
    if (this.#closePrevious) {
      try {
        await this.#closePrevious();
      } finally {
        this.#closePrevious = null;
      }
    }
  }

  async success(config: MessageDialogConfig<C>): Promise<SuccessDialogResult> {
    await this.#prepare();
    return this.#openDialog('success', config, null, [this.#confirmBtn]);
  }

  async warn(config: MessageDialogConfig<C>): Promise<WarnDialogResult> {
    await this.#prepare();
    return this.#openDialog('warn', config, null, [this.#confirmBtnDanger]);
  }

  async error(config: MessageDialogConfig<C>): Promise<ErrorDialogResult> {
    await this.#prepare();
    return this.#openDialog('error', config, null, [this.#confirmBtnDanger]);
  }

  async confirm(config: ConfirmDialogConfig<C>): Promise<ConfirmDialogResult> {
    await this.#prepare();
    return this.#openDialog('confirm', config, null, [this.#confirmBtn, this.#cancelBtn]);
  }

  async confirmCritical(config: ConfirmDialogConfig<C>): Promise<ConfirmCriticalDialogResult> {
    await this.#prepare();
    return this.#openDialog('confirmCritical', config, null, [
      this.#confirmBtnDanger,
      this.#cancelBtn,
    ]);
  }

  async input(config: InputDialogConfig<C>): Promise<InputDialogResult> {
    await this.#prepare();
    return this.#openDialog('input', config, null, [this.#confirmBtnDanger, this.#cancelBtn]);
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
        case 'confirm':
        case 'confirmCritical':
          setResult(
            id === symbolConfirm
              ? { canceled: false, aborted: false, data: null }
              : { canceled: true, aborted: false }
          );
          break;
        case 'input':
          setResult(
            id === symbolConfirm
              ? { canceled: false, aborted: false, data: {} }
              : { canceled: true, aborted: false }
          );
          break;
      }
    };

    const onButtonClicked = async (id: Symbol) => {
      if (this.#autoCloseDialogs) {
        await closeDialog();
      } else {
        this.#closePrevious = closeDialog;
      }

      finish(id);
    };

    const cancel = async (id: Symbol) => {
      await closeDialog();
      finish(symbolCancel);
    };

    const slotContents: any = [];
    const internalSlotContents: any = [];

    const icon = this.#config.getDialogIcon ? this.#config.getDialogIcon(dialogType) || null : null;

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
      const [loadingToggle, setLoadingValue] = createToggle(); // TODO ro

      const actionButton = (
        this.#adapter.renderActionButton || this.#renderDefaultActionButton.bind(this)
      )(buttonConfig.type, buttonConfig.text, loadingToggle, async () => {
        setTimeout(() => setLoadingValue(true), 150);
        onButtonClicked(buttonConfig.id);
      });

      if (this.#adapter.renderActionButton) {
        slotContents.push(['action-button', actionButton]);
      } else {
        internalSlotContents.push(['action-button', actionButton]);
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

  #renderDefaultCloseButton(text: string, onClick: () => void) {
    const closeButton = h('button', {
      className: 'close-button',
      onclick: onClick,
    });

    closeButton.innerHTML = closeIcon.getSvgText();
    return closeButton;
  }

  #renderDefaultActionButton(
    type: ActionButtonType,
    text: string,
    loadingToggle: Toggle,
    onClick: () => {}
  ) {
    const buttomElem = h(
      'button',
      {
        className: 'action-button' + (loadingToggle.value ? ' loading' : ''),
        'data-type': type,
        onclick: onClick,
      },
      h('span', { className: 'spinner' }),
      h('span', { className: 'button-text' }, text)
    );

    loadingToggle.onChange((value) => {
      if (value) {
        buttomElem.classList.add('loading');
      } else {
        buttomElem.classList.remove('loading');
      }
    });

    return buttomElem;
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
      updateDialog: (slotContents, proeprties) => {}, // TODO!!!!!
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
