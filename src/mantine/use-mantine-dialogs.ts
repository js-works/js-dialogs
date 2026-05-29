import { createDialogsController } from '../main/core/dialog-controller.js';
import { Button, CloseButton } from '@mantine/core';
import { useModals } from '@mantine/modals';
import { createElement as h, useEffect, useState, type ReactNode } from 'react';
import { type ActionButtonType, type DialogAdapter } from '../main/core/types.js';
import { DefaultIconsPlugin } from '../main/plugins/default-icons.js';
import type { Toggle } from '../main/core/toggles.js';

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

function useMantineDialogAdapter(): DialogAdapter<ReactNode> {
  const modals = useModals();
  const [adapter] = useState(() => createMantineDialogAdapter(modals));
  return adapter;
}

function createMantineDialogAdapter(
  modals: ReturnType<typeof useModals>
): DialogAdapter<ReactNode> {
  return {
    openDialog(data: any) {
      const slots = [] as any;

      data.slotContents.forEach((entry: any, idx: number) => {
        slots.push(h('div', { slot: entry[0], key: `${entry[0]}-${idx}` }, entry[1]));
      });

      let setInnerContent: any;

      function DialogContent() {
        let content: any;
        [content, setInnerContent] = useState(() =>
          h(data.customDialogTagName, { useNativeDialog: false, ...data.properties }, slots)
        );

        return h(
          'div',
          null,
          h(
            'style',
            null,
            `.${data.id} > .mantine-Modal-inner >  .mantine-Modal-content > .mantine-Modal-body { padding: 0; }`
          ),
          content
        );
      }

      const modalId = modals.openModal({
        className: data.id,
        withCloseButton: false,
        children: h(DialogContent),
      });

      return {
        updateDialog: (slotContents, properties) => {
          const slots = [] as any;

          slotContents.forEach((entry: any, idx: number) => {
            slots.push(h('div', { slot: entry[0], key: `${entry[0]}-${idx}` }, entry[1]));
          });

          setContent(h(data.customDialogTagName, { useNativeDialog: false, ...properties }, slots));
        },

        closeDialog: () =>
          new Promise((resolve) => {
            const dlg = document.querySelector(`.${data.id} > .mantine-Overlay-root`)!;

            dlg.addEventListener('transitionend', (ev: any) => {
              if (ev.target === dlg) {
                resolve();
              }
            });

            modals.closeModal(modalId);
          }),
      };
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

  useEffect(() => {
    console.log('update');
  });

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
