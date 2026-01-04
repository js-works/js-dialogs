import { Button, CloseButton } from '@mantine/core';
import { useModals } from '@mantine/modals';
import { createElement as h, useState, type ReactElement } from 'react';
import { DialogController } from '../core/dialogs-controller';
import type { DialogAdapter } from '../core/dialogs-controller';

export function useDialogs() {
  const modals = useModals();

  const [dialogs] = useState(
    () =>
      new DialogController<ReactElement>({
        openDialog(data: any) {
          const slots = [] as any;

          data.slotContents.forEach((entry: any, idx: any) => {
            slots.push(h('div', { slot: entry[0], key: idx }, entry[1]));
          });

          modals.openModal({
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
              h(data.customDialogTagName, { useNativeDialog: false }, slots)
            ),
          });
        },

        renderCloseButton(text: any, onClick: any) {
          return h(CloseButton as any, { onClick });
        },

        renderActionButton(appearance: any, text: any, onClick: any) {
          const variant =
            appearance === 'primary' || appearance === 'danger'
              ? 'filled'
              : 'default';

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
