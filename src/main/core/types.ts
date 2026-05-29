import { SvgContent } from './svg';
import { CssContent } from './css';
import type { Toggle } from './toggles';

export type {
  ActionButtonType,
  DialogAdapter,
  DialogControllerConfig,
  DialogType,
  Plugin,
  Renderable,
};

type Renderable<C> = C | string | number | null | undefined;

type DialogType = 'info' | 'success' | 'warn' | 'error' | 'confirm' | 'approve';

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
  getDialogIcon?(dialogType: DialogType): SvgContent | null;
}

interface Plugin {
  mapDialogControllerConfig(config: DialogControllerConfig): DialogControllerConfig;
}
