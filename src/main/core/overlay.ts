export async function runWithOverlay<T = void>(supply: () => Promise<T>): Promise<T> {
  let result: T;

  const dialogId = '__internal__overlay-dialog-' + Math.round(Math.random() * 100000) + Date.now();
  const spinnerId = dialogId + '--spinner';
  const closingDataAttributeName = `data-closing` + dialogId;
  const container = document.createElement('div');
  const transitionDuration = '400ms';
  const transitionDelay = '400ms';

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
              background-color: rgba(0, 0, 0, 0);
            }
          }
          
          &::backdrop {
            background-color: rgba(0, 0, 0, 0.8);
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
          border: 6px solid rgba(255, 255, 255, 0.2);
          border-top: 6px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @starting-style {
            #${dialogId} {
                opacity: 0;
                border: 10px solid red;
            }

            #${dialogId}[open]::backdrop {
                background-color: rgba(0, 0, 0, 0);
                backdrop-filter: blur(0);
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

  try {
    result = await supply();
  } finally {
    dialog.setAttribute(closingDataAttributeName, '');

    await new Promise((resolve) => {
      dialog.addEventListener('transitionend', () => resolve(null));
    });

    dialog.remove();
    globalThis.removeEventListener('keydown', preventDefault, true);
  }

  return result;
}
