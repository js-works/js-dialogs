import { createRoot } from 'react-dom/client';
import { Button, MantineProvider, PasswordInput, TextInput } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { useMantineDialogs } from '../mantine/use-mantine-dialogs.js';
import { dialogs } from './vanilla-dialogs.js';

import './style.css';
import '@mantine/core/styles.css';
import { runWithOverlay } from '../main/core/overlay.js';
import { html, toHtmlElement } from '../main/core/html.js';
import { css } from '../main/core/css.js';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = html`
  <div id="column-1">
    <button id="btn-info" class="btn">Info (vanilla)</button>
    <button id="btn-success" class="btn">Success (vanilla)</button>
    <button id="btn-warn" class="btn">Warn (vanilla)</button>
    <button id="btn-error" class="btn">Error (vanilla)</button>
    <button id="btn-confirm" class="btn">Confirm (vanilla)</button>
    <button id="btn-confirm-critical" class="btn">Confirm critical (vanilla)</button>
    <button id="btn-decide" class="btn">Decide (vanilla)</button>
    <button id="btn-form" class="btn">Form</button>
    <br />
    <button id="temp" class="btn">Click me</button>
    <button id="temp2" class="btn">Click me</button>
  </div>
  <div id="column-2"></div>
`.asString();

document.querySelector<HTMLButtonElement>('#temp')!.onclick = async () => {
  await runWithOverlay(async () => await sleep(2000));

  await dialogs.confirmCritical({
    title: 'Confirm deletion',
    content: 'Are you really sure that the file shall be deleted?',
    buttonTexts: {
      confirm: 'Delete File',
    },
  });
};

document.querySelector<HTMLButtonElement>('#temp2')!.onclick = async () => {
  dialogs.flow(async (scope) => {
    const confirmResult = await scope.confirmCritical({
      title: 'Confirm deletion',
      content: 'Are you really sure that the file should be deleted?',
      buttonTexts: {
        confirm: 'Delete File',
      },
    });

    if (confirmResult.canceled) {
      return;
    }

    await sleep(3000);

    if (true) {
      await scope.success({
        content: 'File deleted successfully',
      });
    } else {
      await scope.error({
        content: 'File could not be deleted',
      });
    }
  });
};

document.querySelector<HTMLButtonElement>('#btn-info')!.onclick = async () => {
  const result = await dialogs.info({
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

document.querySelector<HTMLButtonElement>('#btn-confirm-critical')!.onclick = async () => {
  const result = await dialogs.confirmCritical({
    title: 'Delete customer',
    subtitle: 'Customer: #1235 - Jane Doe',
    content: 'Are you really sure that the customer shall be deleted?\nThis cannot made undone.',
    buttonTexts: {
      confirm: 'Delete',
    },
  });

  console.log(result);
};

document.querySelector<HTMLButtonElement>('#btn-decide')!.onclick = async () => {
  const result = await dialogs.decide({
    title: 'Question',
    content: 'Do you want the configuration to be reset?',
  });

  console.log(result);
};

document.querySelector<HTMLButtonElement>('#btn-form')!.onclick = async () => {
  dialogs.flow(async scope => {
  const result = await scope.form({
    title: 'Delete customer',
    content: toHtmlElement(html`
      <div>
        <label>
          Username
          <div>
            <input name="username" required autofocus>
          </div>
        </label>
        <label>
          Password
          <div>
            <input type="password" name="password" required>
          </div>
        </label>
      </div>
    `.asString()),
    styles: css`
      label {
        display: block;
        font-weight: 600;
      }

      input {
        outline: none;
        border: 1px solid #555;
        width: 100%;
        margin-bottom: 0.5em;
        font-weight: normal;
        box-sizing: border-box;
        height: 2em;
        border-radius: 2px;

        &:user-invalid {
          border: 1px solid red;
          
          &:focus {
            border: 3px solid red;
          }
        }
      }
    `,
    buttonTexts: {
      confirm: 'Delete',
    },
  });


  console.log(result);

  if (!result.canceled) {
    console.log(result.data.toRecord())
  }

  if (result.canceled) {
    return;
  }
  await sleep(2000)
})
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
      subtitle: 'Bla bla bla...',
      content: 'Happy New Year 2026',
    });

    console.log(result);
  };

  const onWarnClick = async () => {
    const result = await dialogs.warn({
      subtitle: 'Bla bla bla...',
      content: 'Happy New Year 2026',
    });

    console.log(result);
  };

  const onErrorClick = async () => {
    const result = await dialogs.error({
      subtitle: 'Bla bla bla...',
      content: 'Happy New Year 2026',
    });

    console.log(result);
  };

  const onConfirmClick = async () => {
    const result = await dialogs.confirm({
      title: 'Delete customer',
      content: (
        <div>
          <div>Are you really sure that customer #1235 (Jane Doe) shall be deleted?</div>
          <br />
          <em>Warning:</em> This cannot made undone.
        </div>
      ),
      buttonTexts: {
        confirm: 'Delete',
      },
    });

    console.log(result);
  };

  const onConfirmCriticalClick = async () => {
    const result = await dialogs.confirmCritical({
      title: 'Delete customer',
      subtitle: 'Customer: #1235 - Jane Doe',
      content: 'Are you really sure that the customer shall be deleted?\nThis cannot made undone.',
      buttonTexts: {
        confirm: 'Delete',
      },
    });

    console.log(result);
  };

  const onFormClick = async () => {
    await dialogs.flow(async scope => {

    await sleep(2000);
    const userData: any = { 
      userNumber: 123,
      firstName: "Jane",
      lastName: "Doe",
      city: "New York"
    };

    const result = await scope.form({
      title: 'Edit user',
      content: (
        <>
          <TextInput label="User no." name="userNumber" value={userData.userNumber} readOnly required/>
          <TextInput label="First name" name="firstName" defaultValue={userData.firstName} required />
          <TextInput label="Last name" name="lastName" defaultValue={userData.lastName} required />
        </>
      ),
      buttonTexts: {
        confirm: 'Save user profile',
      },
    });
    
    console.log(result);

    if (!result.canceled) {
      console.log(result.data.toRecord())
      await sleep(2000);
      
      await scope.success({
        content: "User profile has been updated successfully."
      })
    }
  })};

  return (
    <>
      <Button onClick={onInfoClick}>Info (Mantine)</Button>
      <Button onClick={onSuccessClick}>Success (Mantine)</Button>
      <Button onClick={onWarnClick}>Warn (Mantine)</Button>
      <Button onClick={onErrorClick}>Error (Mantine)</Button>
      <Button onClick={onConfirmClick}>Confirm (Mantine)</Button>
      <Button onClick={onConfirmCriticalClick}>Confirm critical (Mantine)</Button>
      <Button onClick={onFormClick}>Form (Mantine)</Button>
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

function sleep(millis: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(undefined), millis);
  });
}
