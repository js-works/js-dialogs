import { SvgContent } from './svg';
import { CssContent } from './css';
import type { Toggle } from './toggles';
import type { TextKey } from './i18n';
import { DefaultDialogsController } from './default-dialogs-controller';
import { defaultDialogAdapter } from './default-interaction-adapter';

export { createInteractionAdapter as createDialogAdapter, createDialogsController };

export type {
  ActionButtonType,
  BaseDialogConfig,
  InteractionAdapter,
  DialogsController,
  DialogControllerConfig,
  DialogScope,
  DialogType,
  Plugin,
  Renderable,

  // Dialog configs
  InfoDialogConfig,
  SuccessDialogConfig,
  WarnDialogConfig,
  ErrorDialogConfig,
  ConfirmDialogConfig,
  DecideDialogConfig,
  FormDialogConfig,

  // Dialog results
  InfoDialogResult,
  SuccessDialogResult,
  WarnDialogResult,
  ErrorDialogResult,
  ConfirmDialogResult,
  DecideDialogResult,
  FormDialogResult,
};

// ===================================================================
// Types
// ===================================================================

type Renderable<C> = C | string | number | null | undefined;

type DialogType =
  | 'info'
  | 'success'
  | 'warn'
  | 'error'
  | 'confirm'
  | 'confirmCritical'
  | 'decide'
  | 'decideCritical'
  | 'form'
  | 'formCritical';

type ActionButtonType = 'primary' | 'secondary' | 'danger';

interface InteractionAdapter<C> {
  openDialog?(params: {
    id: string;
    customDialogTagName: string;
    slotContents: [string, Renderable<C>][];
    properties: Record<string, unknown>;
    cancel(): void;
  }): {
    updateDialog: (
      slotContents: [string, Renderable<C>[]],
      properties: Record<string, unknown>
    ) => void;
    closeDialog: () => Promise<void>;
  };

  renderForm(children: C, onSubmit: (ev: SubmitEvent) => void): C;
  renderSpinner?(): Renderable<C>;
  renderCloseButton?(text: string, onClick: () => void): Renderable<C>;

  renderActionButton?(
    type: ActionButtonType,
    text: string,
    loadingToggle: Toggle,
    onClick: () => void
  ): Renderable<C>;

  getStyles?(tagName: string): CssContent;
}

interface DialogControllerConfig {
  getText?(textKey: TextKey): string;
  getDialogIcon?(dialogType: DialogType): SvgContent | null;
}

interface Plugin {
  mapDialogControllerConfig(config: DialogControllerConfig): DialogControllerConfig;
}

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

interface InfoDialogConfig<C> extends BaseDialogConfig<C> {}
interface SuccessDialogConfig<C> extends BaseDialogConfig<C> {}
interface WarnDialogConfig<C> extends BaseDialogConfig<C> {}
interface ErrorDialogConfig<C> extends BaseDialogConfig<C> {}
interface ConfirmDialogConfig<C> extends BaseDialogConfig<C> {}
interface DecideDialogConfig<C> extends BaseDialogConfig<C> {}
interface FormDialogConfig<C> extends BaseDialogConfig<C> {}

interface DialogsFunctions<C> {
  info(config: InfoDialogConfig<C>): Promise<InfoDialogResult>;
  success(config: SuccessDialogConfig<C>): Promise<SuccessDialogResult>;
  warn(config: WarnDialogConfig<C>): Promise<WarnDialogResult>;
  error(config: ErrorDialogConfig<C>): Promise<ErrorDialogResult>;
  confirm(config: ConfirmDialogConfig<C>): Promise<ConfirmDialogResult>;
  confirmCritical(config: ConfirmDialogConfig<C>): Promise<ConfirmDialogResult>;
  decide(config: DecideDialogConfig<C>): Promise<DecideDialogResult>;
  decideCritical(config: DecideDialogConfig<C>): Promise<DecideDialogResult>;
  form(config: FormDialogConfig<C>): Promise<FormDialogResult>;
  formCritical(config: FormDialogConfig<C>): Promise<FormDialogResult>;
}

interface DialogsController<C> extends DialogsFunctions<C> {
  flow<T>(action: (scope: DialogScope<C>) => Promise<T>): Promise<T>;
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

type InfoDialogResult = DialogResult<'ok'>;
type SuccessDialogResult = DialogResult<'ok'>;
type WarnDialogResult = DialogResult<'ok'>;
type ErrorDialogResult = DialogResult<'ok'>;
type ConfirmDialogResult = DialogResult<'confirm'>;
type DecideDialogResult = DialogResult<'confirm' | 'decline'>;
type FormDialogResult = DialogResult<'confirm', FormData>;

// ===================================================================
// Functions
// ===================================================================

function createInteractionAdapter<C>(params: any): InteractionAdapter<C> {
  // TODO - no any
  return Object.freeze({ ...defaultDialogAdapter, ...params });
}

function createDialogsController(params?: { plugins?: Plugin[] }): DialogsController<Node>;

function createDialogsController<C>(params: {
  adapter: InteractionAdapter<C>;
  plugins?: Plugin[];
}): DialogsController<C>;

function createDialogsController(params?: any): DialogsController<any> {
  // TODO - no any
  const adapter = params?.adapter || defaultDialogAdapter;

  let mappedConfig: DialogControllerConfig = params?.config || {};
  const plugins = params?.plugins || [];

  for (const plugin of plugins) {
    if (plugin.mapDialogControllerConfig)
      mappedConfig = { ...mappedConfig, ...plugin.mapDialogControllerConfig(mappedConfig) };
  }

  return new DefaultDialogsController(mappedConfig, adapter);
}
