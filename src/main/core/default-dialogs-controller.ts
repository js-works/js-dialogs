import type {
  ConfirmDialogConfig,
  ConfirmDialogResult,
  DecideDialogConfig,
  DecideDialogResult,
  DialogControllerConfig,
  DialogsController,
  DialogScope,
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
} from './exports.js';

import { defaultDialogAdapter } from './default-interaction-adapter.js';
import { DefaultDialogScope } from './default-dialogs-scope.js';

export { DefaultDialogsController };

class DefaultDialogsController<C> implements DialogsController<C> {
  readonly #config: DialogControllerConfig;
  readonly #adapter: InteractionAdapter<C>;

  constructor(config: DialogControllerConfig, adapter?: InteractionAdapter<C>) {
    this.#config = config;

    if (adapter) {
      const customAdapter: InteractionAdapter<C> = {
        ...(defaultDialogAdapter as any),
      };

      for (const prop of Object.keys(adapter)) {
        if (typeof (adapter as any)[prop] === 'function') {
          (customAdapter as any)[prop] = (adapter as any)[prop].bind(adapter);
        }
      }

      this.#adapter = customAdapter;
    } else {
      this.#adapter = defaultDialogAdapter as InteractionAdapter<any>;
    }
  }

  open(): DialogScope<C> {
    const abortController = new AbortController();

    return new DefaultDialogScope(false, abortController.signal, this.#config, this.#adapter);
  }

  info(config: InfoDialogConfig<C>): Promise<InfoDialogResult> {
    return this.#createScope().info(config);
  }

  success(config: SuccessDialogConfig<C>): Promise<SuccessDialogResult> {
    return this.#createScope().success(config);
  }

  warn(config: WarnDialogConfig<C>): Promise<WarnDialogResult> {
    return this.#createScope().warn(config);
  }

  error(config: ErrorDialogConfig<C>): Promise<ErrorDialogResult> {
    return this.#createScope().error(config);
  }

  confirm(config: ConfirmDialogConfig<C>): Promise<ConfirmDialogResult> {
    return this.#createScope().confirm(config);
  }

  confirmCritical(config: ConfirmDialogConfig<C>): Promise<ConfirmDialogResult> {
    return this.#createScope().confirmCritical(config);
  }

  decide(config: DecideDialogConfig<C>): Promise<DecideDialogResult> {
    return this.#createScope().decide(config);
  }

  decideCritical(config: DecideDialogConfig<C>): Promise<DecideDialogResult> {
    return this.#createScope().decideCritical(config);
  }

  form(config: FormDialogConfig<C>): Promise<FormDialogResult> {
    return this.#createScope().form(config);
  }

  formCritical(config: FormDialogConfig<C>): Promise<FormDialogResult> {
    return this.#createScope().formCritical(config);
  }

  #createScope() {
    return new DefaultDialogScope(true, null, this.#config, this.#adapter);
  }
}
