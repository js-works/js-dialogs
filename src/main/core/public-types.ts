import { SvgContent } from './svg';
import { CssContent } from './css';
import type { Toggle } from './toggles';
import type { TextKey } from './i18n';

export type {
  ActionButtonType,
  BaseDialogConfig,
  DialogAdapter,
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

type Renderable<C> = C | string | number | null | undefined;

type DialogType = 'info' | 'success' | 'warn' | 'error' | 'confirm' | 'decide' | 'form';

type ActionButtonType = 'primary' | 'secondary' | 'danger';

interface DialogAdapter<C> {
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

interface ConfirmDialogConfig<C> extends BaseDialogConfig<C> {
  critical?: boolean;
}

interface DecideDialogConfig<C> extends BaseDialogConfig<C> {
  critical?: boolean;
}

interface FormDialogConfig<C> extends BaseDialogConfig<C> {
  critical?: boolean;
}

interface DialogsFunctions<C> {
  info(config: InfoDialogConfig<C>): Promise<InfoDialogResult>;
  success(config: SuccessDialogConfig<C>): Promise<SuccessDialogResult>;
  warn(config: WarnDialogConfig<C>): Promise<WarnDialogResult>;
  error(config: ErrorDialogConfig<C>): Promise<ErrorDialogResult>;
  confirm(config: ConfirmDialogConfig<C>): Promise<ConfirmDialogResult>;
  decide(config: DecideDialogConfig<C>): Promise<DecideDialogResult>;
  form(config: FormDialogConfig<C>): Promise<FormDialogResult>;
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
