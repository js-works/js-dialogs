import { Button, CloseButton } from '@mantine/core';
import { useModals } from '@mantine/modals';
import { createElement as h, useEffect, useState, Fragment, type ReactNode } from 'react';
import { DefaultIconsPlugin } from '../main/plugins/default-icons.js';
import type { Toggle } from '../main/core/toggles.js';

import {
  createDialogsController,
  type ActionButtonType,
  type InteractionAdapter,
} from '../main/core/exports.js';

export function useMantineDialogs() {
  const adapter = useMantineDialogAdapter();

  const [dialogsController] = useState(() =>
    createDialogsController({
      adapter,
      plugins: [new DefaultIconsPlugin()],
    })
  );

  return dialogsController;
}

function useMantineDialogAdapter(): InteractionAdapter<ReactNode> {
  const modals = useModals();
  const [adapter] = useState(() => createMantineDialogAdapter(modals));
  return adapter;
}

function createMantineDialogAdapter(
  modals: ReturnType<typeof useModals>
): InteractionAdapter<ReactNode> {
  return {
    openDialog(params) {
      const slots = [] as any;

      params.slotContents.forEach((entry: any, idx: number) => {
        slots.push(
          h('div', { slot: entry[0], key: `${entry[0]}-${idx}` }, convertToReactNode(entry[1]))
        );
      });

      let setInnerContent: any;

      function DialogContent() {
        let content: any;
        [content, setInnerContent] = useState(() =>
          h(params.customDialogTagName, { useNativeDialog: false, ...params.properties }, slots)
        );

        return h(
          'div',
          null,
          h(
            'style',
            null,
            `.${params.id} > .mantine-Modal-inner >  .mantine-Modal-content > .mantine-Modal-body { padding: 0; }
            `,
            params.styles
          ),
          content
        );
      }

      const modalId = modals.openModal({
        className: params.id,
        withCloseButton: false,
        children: h(DialogContent),
      });

      return {
        updateDialog: (slotContents, properties) => {
          const slots = [] as any;

          slotContents.forEach((entry: any, idx: number) => {
            slots.push(h('div', { slot: entry[0], key: `${entry[0]}-${idx}` }, entry[1]));
          });

          setContent(
            h(params.customDialogTagName, { useNativeDialog: false, ...properties }, slots)
          );
        },

        closeDialog: () =>
          new Promise((resolve) => {
            const dlg = document.querySelector(`.${params.id} > .mantine-Overlay-root`)!;

            dlg.addEventListener('transitionend', (ev: any) => {
              if (ev.target === dlg) {
                resolve();
              }
            });

            modals.closeModal(modalId);
          }),
      };
    },

    renderForm(children, onSubmit) {
      return h('form', { onSubmit }, convertToReactNode(children));
    },

    renderCloseButton(text: any, onClick: any) {
      return h(CloseButton as any, { title: text, onClick });
    },

    renderActionButton(appearance, text, loadingToggle, onClick) {
      return h(DialogButton, { appearance, text, loadingToggle, onClick });
    },
  };
}

function DialogButton(props: {
  appearance: ActionButtonType;
  text: string;
  loadingToggle: Toggle;
  onClick: () => void;
}) {
  const [loading, setLoading] = useState(() => props.loadingToggle.value);

  useEffect(() => {
    return props.loadingToggle.onChange(setLoading);
  }, [props.loadingToggle]);

  const variant =
    props.appearance === 'primary' || props.appearance === 'danger' ? 'filled' : 'default';

  const color = props.appearance === 'danger' ? 'red.9' : undefined;

  return h(
    Button as any,
    {
      variant,
      color,
      loading,
      onClick: props.onClick,
    },
    props.text
  );
}

function convertToReactNode(content: ReactNode): ReactNode {
  if (typeof content === 'string') {
    const lines = content.split(/\r?\n/);

    if (lines.length === 1) {
      return content;
    }

    return h(Fragment, null, ...lines.map((line) => h('div', null, line)));
  }

  return content;
}
