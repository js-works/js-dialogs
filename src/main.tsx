import { html, DialogController } from './core/dialogs-controller.ts';
import { createRoot } from 'react-dom/client';
import { Button, MantineProvider, Text } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { useDialogs } from './mantine/use-dialogs.ts';

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
  const dialogs = useDialogs();

  const onInfoClick = () => {
    dialogs.info({
      title: 'Information',
      subtitle: 'Bla bla bla...',
      content: 'Happy New Year 2026',
    });
  };

  const onSuccessClick = () => {
    dialogs.success({
      title: 'Success',
      subtitle: 'Bla bla bla...',
      content: 'Happy New Year 2026',
    });
  };

  const onWarnClick = () => {
    dialogs.warn({
      title: 'Warning',
      subtitle: 'Bla bla bla...',
      content: 'Happy New Year 2026',
    });
  };

  const onErrorClick = () => {
    dialogs.error({
      title: 'Error',
      subtitle: 'Bla bla bla...',
      content: 'Happy New Year 2026',
    });
  };

  const onConfirmClick = () => {
    dialogs.confirm({
      title: 'Error',
      subtitle: 'Bla bla bla...',
      content: 'Happy New Year 2026',
    });
  };

  const onApproveClick = () => {
    dialogs.approve({
      title: 'Error',
      subtitle: 'Bla bla bla...',
      content: 'Happy New Year 2026',
    });
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
