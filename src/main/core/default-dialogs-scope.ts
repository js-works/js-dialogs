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
import { ExtendedFormData } from './extended-form-data';

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
  allowsForm: boolean;
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
  #dialogId = 'internal-dialog-' + Date.now();
  #customDialogTagName = CustomDialogElement.prepare();
  #closeDialog: any = null; // TODO
  #updateDialog: any = null; // TODO

  constructor(
    autoCloseDialogs: boolean,
    abortSignal: AbortSignal | null,
    config: DialogControllerConfig,
    adapter: InteractionAdapter<C>
  ) {
    this.#autoCloseDialogs = autoCloseDialogs;
    this.#config = config;
    this.#adapter = adapter;
    this.#closePrevious = null;

    const spinner = this.#adapter.renderSpinner();

    if (!this.#autoCloseDialogs) {
      const { closeDialog, updateDialog } = this.#adapter.openDialog!({
        id: this.#dialogId,
        cancel: () => {},
        customDialogTagName: this.#customDialogTagName,
        properties: {},
        slotContents: [['spinner', spinner]],
        styles: '',
      });

      this.#updateDialog = updateDialog;
      this.#closeDialog = closeDialog;
    }

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

  info(config: InfoDialogConfig<C>): Promise<InfoDialogResult> {
    return this.#openDialog({
      dialogType: 'info',
      defaultTitle: 'titleInfo',
      config,
      buttons: [okBtn],
      allowsForm: false,
    });
  }

  success(config: SuccessDialogConfig<C>): Promise<SuccessDialogResult> {
    return this.#openDialog({
      dialogType: 'success',
      defaultTitle: 'titleSuccess',
      config,
      buttons: [okBtn],
      allowsForm: false,
    });
  }

  warn(config: WarnDialogConfig<C>): Promise<WarnDialogResult> {
    return this.#openDialog({
      dialogType: 'warn',
      defaultTitle: 'titleWarn',
      config,
      buttons: [okBtnDanger],
      allowsForm: false,
    });
  }

  error(config: ErrorDialogConfig<C>): Promise<ErrorDialogResult> {
    return this.#openDialog({
      dialogType: 'error',
      defaultTitle: 'titleError',
      config,
      buttons: [okBtnDanger],
      allowsForm: false,
    });
  }

  confirm(config: ConfirmDialogConfig<C>): Promise<ConfirmDialogResult> {
    return this.#openDialog({
      dialogType: 'confirm',
      defaultTitle: 'titleConfirm',
      config,
      buttons: [confirmBtn, cancelBtn],
      allowsForm: true,
    });
  }

  confirmCritical(config: ConfirmDialogConfig<C>): Promise<ConfirmDialogResult> {
    return this.#openDialog({
      dialogType: 'confirmCritical',
      defaultTitle: 'titleConfirmCritical',
      config,
      buttons: [confirmBtnDanger, cancelBtn],
      allowsForm: true,
    });
  }

  decide(config: DecideDialogConfig<C>): Promise<DecideDialogResult> {
    return this.#openDialog({
      dialogType: 'decide',
      defaultTitle: 'titleDecide',
      config,
      buttons: [yesBtn, noBtn, cancelBtn],
      allowsForm: true,
    });
  }

  decideCritical(config: DecideDialogConfig<C>): Promise<DecideDialogResult> {
    return this.#openDialog({
      dialogType: 'decideCritical',
      defaultTitle: 'titleDecideCritical',
      config,
      buttons: [yesBtnDanger, noBtn, cancelBtn],
      allowsForm: true,
    });
  }

  form(config: FormDialogConfig<C>): Promise<FormDialogResult> {
    return this.#openDialog({
      dialogType: 'form',
      defaultTitle: 'titleForm',
      config,
      buttons: [confirmBtn, cancelBtn],
      allowsForm: true,
    });
  }

  formCritical(config: FormDialogConfig<C>): Promise<FormDialogResult> {
    return this.#openDialog({
      dialogType: 'form',
      defaultTitle: 'titleFormCritical',
      config,
      buttons: [confirmBtnDanger, cancelBtn],
      allowsForm: true,
    });
  }

  async #openDialog(config: DialogConfig<C>): Promise<any> {
    let resolve: (value: any) => void;
    const buttons = this.#getDialogButtons(config);

    if (!this.#initialized) {
      this.#initialize(this.#customDialogTagName);
    }

    await this.#closePreviousIfExisting();

    const onButtonClicked = async (buttonConfig: ButtonConfig) => {
      let form: HTMLFormElement | null = null;

      if (config.allowsForm && buttonConfig.validate) {
        form = document.querySelector<HTMLFormElement>(
          `#${this.#dialogId} > [slot=content] > form`
        );
        form?.requestSubmit();
        const valid = form?.reportValidity() ?? true;

        if (!valid) {
          await this.#closePrevious?.();
          this.#closePrevious = null;
          return;
        }
      }

      if (this.#autoCloseDialogs) {
        await this.#closeDialog();
      } else {
        this.#closePrevious = this.#closeDialog;
      }

      this.#finish(buttonConfig.id, config.dialogType, form, resolve);
    };

    const slotContents: any = [];
    const internalSlotContents: any = [];

    const icon = this.#config.getDialogIcon
      ? this.#config.getDialogIcon(config.dialogType) || null
      : null;

    if (icon) {
      internalSlotContents.push(['dialog-icon', html.raw(icon.getSvgText())]);
    }

    const title = config.config.title ?? this.#getText(config.defaultTitle);
    slotContents.push(['title', title]);

    for (const slot of ['subtitle', 'intro', 'content', 'outro', 'spinner']) {
      let children = (config.config as any)[slot];

      if (slot === 'content') {
        children = this.#adapter.renderForm(children, (ev) => {
          ev.preventDefault();
        });
      }

      slotContents.push([slot, children]);
    }

    const closeButton = (
      this.#adapter.renderCloseButton || this.#renderDefaultCloseButton.bind(this)
    )('Close', () => onButtonClicked(cancelBtn));

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
        const timeout = setTimeout(() => setLoadingValue(true), 150);
        this.#closePrevious = async () => clearTimeout(timeout);
        onButtonClicked(buttonConfig);
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

    if (!this.#updateDialog) {
      const { closeDialog, updateDialog } = this.#adapter.openDialog!({
        id: this.#dialogId,
        styles: this.#getStyles(this.#dialogId, config),
        customDialogTagName: this.#customDialogTagName,
        properties: { id: this.#dialogId, 'data-dialog-type': config.dialogType, init },
        slotContents: slotContents,
        cancel: () => {}, // TODO!!!!!!!
      });

      this.#updateDialog = updateDialog;
      this.#closeDialog = closeDialog;
    } else {
      this.#updateDialog({
        id: this.#dialogId,
        styles: this.#getStyles(this.#dialogId, config),
        customDialogTagName: this.#customDialogTagName,
        properties: { id: this.#dialogId, 'data-dialog-type': config.dialogType, init },
        slotContents: slotContents,
        cancel: () => {}, // TODO!!!!!!!
      });
    }

    return new Promise((res) => {
      resolve = res;
    });
  }

  #initialize(tagName: string) {
    const styles = this.#adapter.getStyles?.(tagName) || null;

    // TODO - only one time
    if (styles) {
      const styleSheet = new CSSStyleSheet();
      styleSheet.replaceSync(styles.getCssText());
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, styleSheet];
    }

    this.#initialized = true;
  }

  #getStyles(dialogId: string, dialogConfig: DialogConfig<C>): string | null {
    let ret: string | null = null;
    const s = dialogConfig.config.styles;

    if (!s || typeof s === 'string') {
      ret = s || null;
    } else if ('getCssText' in s) {
      ret = s.getCssText();
    } else {
      ret = s?.toString();
    }

    return s
      ? `
      #${dialogId} {
        ${ret} 
      }
    `
      : null;
  }

  #getDialogButtons(dialogConfig: DialogConfig<C>) {
    const buttonTexts = dialogConfig.config.buttonTexts;

    if (!buttonTexts) {
      return dialogConfig.buttons;
    }

    const buttons = [...dialogConfig.buttons];

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

    return buttons;
  }

  #finish(
    id: Symbol,
    dialogType: DialogType,
    form: HTMLFormElement | null,
    resolve: (value: any) => void
  ) {
    const result = Object.create(null);
    const data = form ? new ExtendedFormData(form) : null;

    switch (dialogType) {
      case 'info':
      case 'success':
      case 'warn':
      case 'error':
      case 'confirm':
      case 'confirmCritical':
      case 'decide':
      case 'decideCritical':
        resolve(
          id === symbolOk || id === symbolConfirm || id === symbolDecline
            ? Object.assign(result, {
                canceled: false,
                aborted: false,
                action: id.description,
                data: null,
              })
            : Object.assign(result, { canceled: true, aborted: false })
        );
        break;
      case 'form':
      case 'formCritical':
        resolve(
          id === symbolConfirm
            ? Object.assign(result, {
                canceled: false,
                aborted: false,
                action: id.description,
                data,
              })
            : Object.assign(result, { canceled: true, aborted: false })
        );
        break;
    }
  }

  async #closePreviousIfExisting() {
    // TODO
    /*
    if (this.#closePrevious) {
      try {
        await this.#closePrevious();
      } finally {
        this.#closePrevious = null;
        this.#updateDialog = null;
      }
    }
    */
  }

  #getText(textKey: TextKey) {
    if (this.#config.getText) {
      return this.#config.getText(textKey);
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

  [Symbol.dispose](): void {
    if (!this.#closeDialog) {
      return;
    }

    this.#closeDialog();
    this.#closeDialog = null;
  }
}
