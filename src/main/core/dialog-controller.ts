import { h, html } from './html.js';
import { css } from './css.js';
import { svg } from './svg.js';

import type {
  ConfirmDialogConfig,
  ConfirmDialogResult,
  DecideDialogConfig,
  DecideDialogResult,
  DialogAdapter,
  DialogControllerConfig,
  DialogsController,
  DialogScope,
  ErrorDialogConfig,
  ErrorDialogResult,
  FormDialogConfig,
  FormDialogResult,
  InfoDialogConfig,
  InfoDialogResult,
  Plugin,
  SuccessDialogConfig,
  WarnDialogConfig,
  WarnDialogResult,
} from './public-types.js';

import { showOverlay } from './overlay.js';
import { defaultDialogAdapter } from './default-dialog-adapter.js';
import { CustomDialogElement } from './custom-dialog-element.js';
import { DefaultDialogScope } from './default-dialog-scope.js';

export { createDialogsController, css, h, html, svg, CustomDialogElement };

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

  async flow<T>(action: (scope: DialogScope<C>) => Promise<T>): Promise<T> {
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

  info(config: InfoDialogConfig<C>): Promise<InfoDialogResult> {
    return this.#createScope().info(config);
  }

  success(config: SuccessDialogConfig<C>): Promise<InfoDialogResult> {
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

  decide(config: DecideDialogConfig<C>): Promise<DecideDialogResult> {
    return this.#createScope().decide(config);
  }

  form(config: FormDialogConfig<C>): Promise<FormDialogResult> {
    return this.#createScope().form(config);
  }

  #createScope() {
    return new DefaultDialogScope(null, null, this.#config, this.#adapter);
  }
}
