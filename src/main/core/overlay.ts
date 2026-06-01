export async function runWithOverlay<T = void>(supply: () => Promise<T>): Promise<T> {
  const close = showOverlay();

  try {
    return await supply();
  } finally {
    await close();
  }
}

export function showOverlay(): (immediately?: boolean) => Promise<void> {
  const dialogId = '__internal__overlay-dialog-' + Math.round(Math.random() * 100000) + Date.now();
  const spinnerId = dialogId + '--spinner';
  const closingDataAttributeName = `data-closing` + dialogId;
  const container = document.createElement('div');

  /*
  const transitionDuration = '750ms';
  const transitionDelay = '400ms';
  
  const backdropBackgroundStart = 'rgba(0, 0, 0, 0)';
  const backdropBackgroundEnd = 'rgba(0, 0, 0, 0.75)';
  const spinnerColor1 = 'rgba(255, 255, 255, 0.2)';
  const spinnerColor2 = 'white';
  */

  const transitionDuration = '0ms';
  const transitionDelay = '100ms';

  const backdropBackgroundStart = 'rgba(255, 255, 255, 0)';
  const backdropBackgroundEnd = 'rgba(255, 255, 255, 0.8)';
  const spinnerColor1 = 'rgba(0, 0, 0, 0.6)';
  const spinnerColor2 = 'rgb(0, 0, 0, 0.2)';

  container.innerHTML = `
    <dialog id="${dialogId}">
      <style>
        #${dialogId} {
          position: fixed;
          display: grid;
          width: 100vw;
          height: 100vh;
          grid-template-rows: 4fr auto 6fr;
          background-color: transparent; 
          border: none;
          outline: none;
          overflow: hidden;
          opacity: 0;
          transition: opacity ${transitionDuration} ease 250ms;
          
          &[open] {
            opacity: 1;
          }

          &[open][${closingDataAttributeName}] {
            opacity: 0;

            &::backdrop {
              background-color: ${backdropBackgroundStart}
            }
          }
          
          &::backdrop {
            background-color: ${backdropBackgroundEnd};
            backdrop-filter: blur(0.4px);

            transition:
              background-color ${transitionDuration} ease ${transitionDelay},
              backdrop-filter ${transitionDuration} ease ${transitionDelay};
          }
        }

        #${spinnerId} {
          grid-row: 2;
          justify-self: center;
          align-self: center;
          width: 4em;
          height: 4em;
          border: 6px solid ${spinnerColor1};
          border-top: 6px solid ${spinnerColor2};
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @starting-style {
            #${dialogId} {
                opacity: 0;
            }

            #${dialogId}[open]::backdrop {
                background-color: ${backdropBackgroundStart};
                backdrop-filter: blur(0);
            }
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      </style>
      <div id="${spinnerId}"></div>
    </dialog>
  `;

  const dialog = container.querySelector('dialog')!;
  container.innerHTML = '';
  document.body.append(dialog);
  dialog.showModal();

  const preventDefault = (ev: Event) => ev.preventDefault();

  dialog.addEventListener('cancel', preventDefault);
  globalThis.addEventListener('keydown', preventDefault, true);

  return async (immediately = false) => {
    if (!immediately) {
      dialog.setAttribute(closingDataAttributeName, '');

      await new Promise((resolve) => {
        dialog.addEventListener('transitionend', () => resolve(null), { once: true });
      });
    }

    dialog.remove();
    globalThis.removeEventListener('keydown', preventDefault, true);
  };
}
