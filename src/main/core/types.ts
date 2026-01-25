import { SvgContent } from "./svg";
import { CssContent } from "./css";

export type { ActionButtonType, DialogAdapter, DialogControllerConfig, DialogType, Plugin, Renderable } 

type Renderable<C> = C | string | number | null | undefined;

type DialogType =
  | 'info'
  | 'success'
  | 'warn'
  | 'error'
  | 'confirm'
  | 'approve';

type ActionButtonType = 'primary' | 'secondary' | 'danger';

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


  getStyles?(tagName: string): CssContent;
}

interface DialogControllerConfig {
  getDialogIcon?(dialogType: DialogType): SvgContent | null;
}

interface Plugin {
  mapDialogControllerConfig(config: DialogControllerConfig): DialogControllerConfig
}