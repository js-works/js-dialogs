import { CustomDialogElement } from './custom-dialog-element';
import { toNode } from './dom';
import { html, h } from './html';
import { type TextKey, defaultDialogTexts } from './i18n';
import { svg } from './svg';
import { createToggle, type Toggle } from './toggles';

import type {
  ActionButtonType,
  BaseDialogConfig,
  ConfirmDialogConfig,
  ConfirmDialogResult,
  DecideDialogConfig,
  DecideDialogResult,
  DialogControllerConfig,
  DialogScope,
  DialogType,
  ErrorDialogConfig,
  ErrorDialogResult,
  FormDialogConfig,
  FormDialogResult,
  InfoDialogConfig,
  InfoDialogResult,
  InteractionAdapter,
  SuccessDialogConfig,
  SuccessDialogResult,
  WarnDialogConfig,
  WarnDialogResult,
} from './exports';

export { DefaultDialogScope };

// ===================================================================
// Types
// ===================================================================

interface ButtonConfig {
  id: Symbol;
  type: 'primary' | 'secondary' | 'danger';
  text?: string | null;
  defaultTextKey: TextKey;
  validate: boolean;
}

type DialogConfig<C> = {
  dialogType: DialogType;
  defaultTitle: TextKey;
  config: BaseDialogConfig<C>;
  buttons: ButtonConfig[];
};

// ===================================================================
// Constants
// ===================================================================

const closeIcon = svg`
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
      <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"/>
    </svg>
  `;

const symbolOk = Symbol('ok');
const symbolCancel = Symbol('cancel');
const symbolConfirm = Symbol('confirm');
const symbolDecline = Symbol('decline');

const okBtn: ButtonConfig = {
  id: symbolOk,
  type: 'primary',
  defaultTextKey: 'ok',
  validate: true,
};

const okBtnDanger: ButtonConfig = {
  id: symbolOk,
  type: 'danger',
  defaultTextKey: 'ok',
  validate: true,
};

const confirmBtn: ButtonConfig = {
  id: symbolConfirm,
  type: 'primary',
  defaultTextKey: 'ok',
  validate: true,
};

const confirmBtnDanger: ButtonConfig = {
  id: symbolConfirm,
  type: 'danger',
  defaultTextKey: 'ok',
  validate: true,
};

const cancelBtn: ButtonConfig = {
  id: symbolCancel,
  type: 'secondary',
  defaultTextKey: 'cancel',
  validate: false,
};

const yesBtn: ButtonConfig = {
  id: symbolConfirm,
  type: 'primary',
  defaultTextKey: 'yes',
  validate: true,
};

const yesBtnDanger: ButtonConfig = {
  id: symbolConfirm,
  type: 'danger',
  defaultTextKey: 'yes',
  validate: true,
};

const noBtn: ButtonConfig = {
  id: symbolDecline,
  type: 'secondary',
  defaultTextKey: 'no',
  validate: false,
};

// ===================================================================
// Classes
// ===================================================================

class DefaultDialogScope<C> implements DialogScope<C> {
  readonly #config: DialogControllerConfig;
  readonly #adapter: InteractionAdapter<C>;
  #initialized = false;
  #closePrevious: (() => Promise<void>) | null = null;
  #autoCloseDialogs: boolean;

  constructor(
    closeOverlay: (() => Promise<void>) | null,
    abortSignal: AbortSignal | null,
    config: DialogControllerConfig,
    adapter: InteractionAdapter<C>
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

  async info(config: InfoDialogConfig<C>): Promise<InfoDialogResult> {
    await this.#prepare();
    return this.#openDialog({
      dialogType: 'info',
      defaultTitle: 'titleInfo',
      config,
      buttons: [okBtn],
    });
  }

  async success(config: SuccessDialogConfig<C>): Promise<SuccessDialogResult> {
    await this.#prepare();
    return this.#openDialog({
      dialogType: 'success',
      defaultTitle: 'titleSuccess',
      config,
      buttons: [okBtn],
    });
  }

  async warn(config: WarnDialogConfig<C>): Promise<WarnDialogResult> {
    await this.#prepare();
    return this.#openDialog({
      dialogType: 'warn',
      defaultTitle: 'titleWarn',
      config,
      buttons: [okBtnDanger],
    });
  }

  async error(config: ErrorDialogConfig<C>): Promise<ErrorDialogResult> {
    await this.#prepare();
    return this.#openDialog({
      dialogType: 'error',
      defaultTitle: 'titleError',
      config,
      buttons: [okBtnDanger],
    });
  }

  async confirm(config: ConfirmDialogConfig<C>): Promise<ConfirmDialogResult> {
    await this.#prepare();
    return this.#openDialog({
      dialogType: 'confirm',
      defaultTitle: 'titleConfirm',
      config,
      buttons: [confirmBtn, cancelBtn],
    });
  }

  async confirmCritical(config: ConfirmDialogConfig<C>): Promise<ConfirmDialogResult> {
    await this.#prepare();
    return this.#openDialog({
      dialogType: 'confirmCritical',
      defaultTitle: 'titleConfirmCritical',
      config,
      buttons: [confirmBtnDanger, cancelBtn],
    });
  }

  async decide(config: DecideDialogConfig<C>): Promise<DecideDialogResult> {
    await this.#prepare();
    return this.#openDialog({
      dialogType: 'decide',
      defaultTitle: 'titleDecide',
      config,
      buttons: [yesBtn, noBtn, cancelBtn],
    });
  }

  async decideCritical(config: DecideDialogConfig<C>): Promise<DecideDialogResult> {
    await this.#prepare();
    return this.#openDialog({
      dialogType: 'decideCritical',
      defaultTitle: 'titleDecideCritical',
      config,
      buttons: [yesBtnDanger, noBtn, cancelBtn],
    });
  }

  async form(config: FormDialogConfig<C>): Promise<FormDialogResult> {
    await this.#prepare();
    return this.#openDialog({
      dialogType: 'form',
      defaultTitle: 'titleForm',
      config,
      buttons: [confirmBtn, cancelBtn],
    });
  }

  async formCritical(config: FormDialogConfig<C>): Promise<FormDialogResult> {
    await this.#prepare();
    return this.#openDialog({
      dialogType: 'form',
      defaultTitle: 'titleFormCritical',
      config,
      buttons: [confirmBtnDanger, cancelBtn],
    });
  }

  async #openDialog(dialogConfig: DialogConfig<C>): Promise<any> {
    const dialogType = dialogConfig.dialogType;
    const baseConfig = dialogConfig.config;
    const defaultDialogTitle = dialogConfig.defaultTitle;
    let buttons = dialogConfig.buttons;
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

        if (buttons) {
          const customButtonText = (buttonTexts as any)[buttonConfig.id.description as any];

          if (customButtonText) {
            buttonConfig.text = buttonTexts.confirm;
          }
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
        case 'decide':
        case 'decideCritical':
          setResult(
            id === symbolOk || id === symbolConfirm || id === symbolDecline
              ? { canceled: false, aborted: false, action: id.description, data: null }
              : { canceled: true, aborted: false }
          );
          break;
        case 'form':
        case 'formCritical':
          setResult(
            id === symbolConfirm
              ? { canceled: false, aborted: false, action: id.description, data: {} }
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

    const title = baseConfig.title ?? this.#getText(defaultDialogTitle);
    slotContents.push(['title', title]);

    for (const slot of ['subtitle', 'intro', 'content', 'outro']) {
      let children = (baseConfig as any)[slot];

      // TODO!!!!!!
      if (slot === 'content' && this.#adapter.renderForm) {
        children = this.#adapter.renderForm?.(children, () => {
          alert('TODO');
        });
      }

      slotContents.push([slot, children]);
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
      const buttonText = buttonConfig.text ?? this.#getText(buttonConfig.defaultTextKey);

      const actionButton = (
        this.#adapter.renderActionButton || this.#renderDefaultActionButton.bind(this)
      )(buttonConfig.type, buttonText, loadingToggle, async () => {
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

    if (styles) {
      const styleSheet = new CSSStyleSheet();
      styleSheet.replaceSync(styles.getCssText());
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, styleSheet];
    }

    this.#initialized = true;
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

  #getText(textKey: TextKey) {
    if (this.#config.getText) {
      return (this, this.#config.getText(textKey));
    }

    return defaultDialogTexts[textKey];
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
