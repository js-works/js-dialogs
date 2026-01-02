import { useModals } from '@mantine/modals';
import { createElement as h, useState, type ReactElement } from 'react';
import { DialogController } from '../core/dialogs-controller';

export function useDialogs() {
  const modals = useModals();

  const [dialogs] = useState(
    () =>
      new DialogController<ReactElement>({
        openDialog(data: any) {
          const slots = [];

          for (const [slotName, slotContent] of Object.entries(
            data.slotContents
          )) {
            slots.push(h('div', { slot: slotName }, slotContent as any));
          }

          modals.openModal({
            title: 'Some Title',
            children: h(
              data.customDialogTagName,
              { useNativeDialog: false },
              h('div', { slot: 'content' }, slots)
            ),
          });
        },
      })
  );

  return dialogs;
}
