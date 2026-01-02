import { html, DialogController } from './core/dialogs-controller.ts';
import { createRoot } from 'react-dom/client';
import { Button, MantineProvider, Text } from '@mantine/core';
import { ModalsProvider, useModals } from '@mantine/modals';

import './style.css';
import '@mantine/core/styles.css';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = html`
  <div id="column-1">
    <button id="btn-info" class="btn">Info (vanilla)</button>
    <button id="btn-success" class="btn">Success (vanilla)</button>
    <button id="btn-warn" class="btn">Warn (vanilla)</button>
    <button id="btn-error" class="btn">Error (vanilla)</button>
    <button id="btn-confirm" class="btn">Confirm (vanilla)</button>
    <button id="btn-approve" class="btn">Approve (vanilla)</button>
    <button id="btn-prompt" class="btn">Prompt (vanilla)</button>
  </div>
  <div id="column-2"></div>
`.asString();

const dialogs = new DialogController({});

document.querySelector<HTMLButtonElement>('#btn-info')!.onclick = async () => {
  const result = await dialogs.info({
    title: 'Welcome',
    content: 'Hello, Jane Doe!',
  });

  console.log(result);
};

document.querySelector<HTMLButtonElement>('#btn-success')!.onclick =
  async () => {
    const result = await dialogs.success({
      title: 'Success',
      content: 'File "app.log" has been deleted successfully.',
    });

    console.log(result);
  };

document.querySelector<HTMLButtonElement>('#btn-warn')!.onclick = async () => {
  const result = await dialogs.warn({
    title: 'Warning',
    content: 'Hello, Jane Doe!',
  });

  console.log(result);
};

document.querySelector<HTMLButtonElement>('#btn-error')!.onclick = async () => {
  const result = await dialogs.error({
    title: 'Error',
    content: 'The file could not be deleted!',
  });

  console.log(result);
};

document.querySelector<HTMLButtonElement>('#btn-confirm')!.onclick =
  async () => {
    const result = await dialogs.confirm({
      title: 'Confirmation',
      content: 'Are you really sure the file shall be deleted?',
      outro: 'This cannot made undone.',
    });

    console.log(result);
  };

document.querySelector<HTMLButtonElement>('#btn-approve')!.onclick =
  async () => {
    const result = await dialogs.approve({
      title: 'Approval',
      content:
        'Are you really sure the file shall be deleted?\nThis cannot made undone.',
    });

    console.log(result);
  };

document.querySelector<HTMLButtonElement>('#btn-prompt')!.onclick =
  async () => {
    const result = await dialogs.prompt({
      title: 'Input',
      label: 'Please enter your name',
      value: 'Jane Doe',
    });

    console.log(result);
  };

// === React /Mantine ================================================

const container = document.querySelector('#column-2')!;

const root = createRoot(container);

function MantineDialogDemo() {
  const modals = useModals();

  const onInfoClick = () => {
    modals.openConfirmModal({
      title: 'Please confirm your action',
      children: (
        <Text size="sm">
          This action is so important that you are required to confirm it with a
          modal. Please click one of these buttons to proceed.
        </Text>
      ),
      labels: { confirm: 'Confirm', cancel: 'Cancel' },
      onCancel: () => console.log('Cancel'),
      onConfirm: () => console.log('Confirmed'),
    });
  };

  return <Button onClick={onInfoClick}>Info (Mantine)</Button>;
}

root.render(
  <MantineProvider>
    <ModalsProvider>
      <MantineDialogDemo />
    </ModalsProvider>
  </MantineProvider>
);
