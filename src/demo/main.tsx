import { html } from '../main/index.js';
import { createRoot } from 'react-dom/client';
import { Button, MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { useMantineDialogs } from '../mantine/use-mantine-dialogs.js';
import { dialogs } from './vanilla-dialogs.js';

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
  </div>
  <div id="column-2"></div>
`.asString();

document.querySelector<HTMLButtonElement>('#btn-info')!.onclick = async () => {
  const result = await dialogs.info({
    title: 'Welcome',
    content: 'Hello, Jane Doe!',
  });

  console.log(result);
};

document.querySelector<HTMLButtonElement>('#btn-success')!.onclick = async () => {
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
    content: 'The file could not be deleted!\nPlease try again a later time.',
  });

  console.log(result);
};

document.querySelector<HTMLButtonElement>('#btn-confirm')!.onclick = async () => {
  const result = await dialogs.confirm({
    title: 'Delete customer',
    content:
      'Are you really sure that customer #1235 (Jane Doe) shall be deleted?\nThis cannot made undone.',
    buttonTexts: {
      confirm: 'Delete',
    },
  });

  console.log(result);
};

document.querySelector<HTMLButtonElement>('#btn-approve')!.onclick = async () => {
  const result = await dialogs.approve({
    title: 'Delete customer',
    subtitle: 'Customer: #1235 - Jane Doe',
    content: 'Are you really sure that the customer shall be deleted?\nThis cannot made undone.',
    buttonTexts: {
      confirm: 'Delete',
    },
  });

  console.log(result);
};

// === React /Mantine ================================================

const container = document.querySelector('#column-2')!;

const root = createRoot(container);

function MantineDialogDemo() {
  const dialogs = useMantineDialogs();

  const onInfoClick = async () => {
    const result = await dialogs.info({
      title: 'Information',
      subtitle: 'Bla bla bla...',
      content: 'Happy New Year 2026',
    });

    console.log(result);
  };

  const onSuccessClick = async () => {
    const result = await dialogs.success({
      title: 'Success',
      subtitle: 'Bla bla bla...',
      content: 'Happy New Year 2026',
    });

    console.log(result);
  };

  const onWarnClick = async () => {
    const result = await dialogs.warn({
      title: 'Warning',
      subtitle: 'Bla bla bla...',
      content: 'Happy New Year 2026',
    });

    console.log(result);
  };

  const onErrorClick = async () => {
    const result = await dialogs.error({
      title: 'Error',
      subtitle: 'Bla bla bla...',
      content: 'Happy New Year 2026',
    });

    console.log(result);
  };

  const onConfirmClick = async () => {
    const result = await dialogs.confirm({
      title: 'Delete customer',
      content:
        'Are you really sure that customer #1235 (Jane Doe) shall be deleted?\nThis cannot made undone.',
      buttonTexts: {
        confirm: 'Delete',
      },
    });

    console.log(result);
  };

  const onApproveClick = async () => {
    const result = await dialogs.approve({
      title: 'Delete customer',
      subtitle: 'Customer: #1235 - Jane Doe',
      content: 'Are you really sure that the customer shall be deleted?\nThis cannot made undone.',
      buttonTexts: {
        confirm: 'Delete',
      },
    });

    console.log(result);
  };

  return (
    <>
      <Button onClick={onInfoClick}>Info (Mantine)</Button>
      <Button onClick={onSuccessClick}>Success (Mantine)</Button>
      <Button onClick={onWarnClick}>Warn (Mantine)</Button>
      <Button onClick={onErrorClick}>Error (Mantine)</Button>
      <Button onClick={onConfirmClick}>Confirm (Mantine)</Button>
      <Button onClick={onApproveClick}>Approve (Mantine)</Button>
    </>
  );
}

root.render(
  <MantineProvider>
    <ModalsProvider>
      <MantineDialogDemo />
    </ModalsProvider>
  </MantineProvider>
);
