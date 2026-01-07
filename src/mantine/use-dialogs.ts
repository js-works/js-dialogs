import { Button, CloseButton } from '@mantine/core';
import { useModals } from '@mantine/modals';
import { createElement as h, useState, type ReactElement } from 'react';
import { DialogController } from '../core/dialogs-controller';

export function useDialogs() {
  const modals = useModals();

  const [dialogs] = useState(
    () =>
      new DialogController<ReactElement>({
        openDialog(data: any) {
          const slots = [] as any;

          data.slotContents.forEach((entry: any, idx: number) => {
            slots.push(h('div', { slot: entry[0], key: `${entry[0]}-${idx}` }, entry[1]));
          });

          const modalId = modals.openModal({
            className: data.id,
            withCloseButton: false,
            children: h(
              'div',
              null,
              h(
                'style',
                null,
                `.${data.id} > .mantine-Modal-inner >  .mantine-Modal-content > .mantine-Modal-body { padding: 0; }`
              ),
              h(data.customDialogTagName, { useNativeDialog: false, ...data.properties }, slots)
            ),
          });

          return {
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
          return h(CloseButton as any, { onClick, title: text });
        },

        renderActionButton(appearance: any, text: any, onClick: any) {
          const variant =
            appearance === 'primary' || appearance === 'danger' ? 'filled' : 'default';

          const color = appearance === 'danger' ? 'red.9' : undefined;

          return h(
            Button as any,
            {
              variant,
              color,
              onClick,
            },
            text
          );
        },
      })
  );

  return dialogs;
}
