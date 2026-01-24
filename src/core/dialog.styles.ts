import { css } from "./css.js"

export { dialogStyles }

const theme = {
  primaryTextColor: 'white',
  primaryBackgroundColor: 'oklch(50% 0.134 242.749)',
  secondaryTextColor: 'black',
  secondaryBackgroundColor: 'white',
  secondaryBorderColor: '#b0b0b0',
  dangerTextColor: 'white',
  dangerBackgroundColor: '#BE4545FF',
  borderColor: '#eee',
  dialogBorderRadius: '6px',
  closeButtonBorderRadius: '100%',
  actionButtonBorderRadius: '3px',
  textColor: 'lightDark(black, white)',
  dialogBackgroundColor: 'lightDark(white, #333)',
  animationDuration: '0.25s',
};

const dialogStyles = css`
  dialog {
    outline: none;
    position: fixed;
    top: 18%;
    transform: translateY(-50%);
    color: ${theme.textColor};
    background-color: ${theme.dialogBackgroundColor};
    border: none;
    border-radius: ${theme.dialogBorderRadius};
    outline: none;
    min-width: 23em;
    box-sizing: border-box;
    padding: 0;
    margin: 0 auto;

    &[open]:not(.closing) {
      animation: dialog-fade-in ${theme.animationDuration} ease-in-out;
    }

    &[open].closing {
      animation: dialog-fade-out ${theme.animationDuration} ease-in-out;
    }

    &[open]::backdrop {
      background-color: rgba(0, 0, 0, 0.5);
    }

    &[open]:not(.closing)::backdrop {
      animation: backdrop-fade-in ${theme.animationDuration} ease-in-out;
    }

    &[open].closing::backdrop {
      animation: backdrop-fade-out ${theme.animationDuration} ease-in-out;
    }
  }

  #icon {
    display: flex;
    justify-content: center;
    align-items: center;
    align-self: center;
    aspect-ratio: 1 / 1;
    border-radius: 50%;
    font-size: 150%;
    padding: 0.25em;
  }

  :host([data-dialog-type='info']) #icon,
  :host([data-dialog-type='success']) #icon,
  :host([data-dialog-type='confirm']) #icon,
  :host([data-dialog-type='prompt']) #icon {
    color: ${theme.primaryBackgroundColor};
    background-color: color-mix(in srgb, ${theme.primaryBackgroundColor}, white 87%);
  }

  :host([data-dialog-type='warn']) #icon,
  :host([data-dialog-type='error']) #icon,
  :host([data-dialog-type='approve']) #icon {
    color: ${theme.dangerBackgroundColor};
    background-color: color-mix(in srgb, ${theme.dangerBackgroundColor}, white 87%);
  }

  #icon:is(:has(slot:empty)) {
    display: none;
  }

  .dialog-content {
    user-select: none;
    font-size: 16px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;

    .header {
      display: flex;
      align-items: center;
      gap: 0.5em;
      padding: 1em 1.25em 0.4em 1.25em;
      width: 100%;
      box-sizing: border-box;

      .titles {
        display: flex;
        flex-direction: column;
        width: 100%;
        padding: 0.25em 0 0 0;

        .title {
          display: block;
          font-size: 1.1em;
          font-weight: 600;
        }

        .subtitle {
          display: block;
          font-size: 0.85em;
          line-height: 0.85em;
          padding: 0 1px;
        }
      }
    }

    .body {
      display: flex;
      flex-direction: column;
      gap: 0.5em;
      padding: 0 1.25em 0.75em 1.25em;
      min-height: 2em;
      line-height: 1.25em;

      .intro,
      .content,
      .outro {
        display: block;
      }
    }

    .footer {
      padding: 0.75em;
      user-select: none;

      .action-buttons {
        display: flex;
        flex-direction: row-reverse;
        gap: 0.4em;
      }
    }
  }

  .prompt-label {
    display: flex;
    flex-direction: column;
    font-weight: 600;
    font-size: 90%;
  }

  .prompt-text-field {
    width: 100%;
    outline: none;
    border: 1px solid #aaa;
    box-sizing: border-box;
    padding: 0.3em 0.7em;
    margin: 0.125em 0;
    font-size: 105%;
  }

  .action-button {
    outline: none;
    border: none;
    border-radius: ${theme.actionButtonBorderRadius};
    padding: 0.6em 1.75em;
    cursor: pointer;

    &[data-type='primary'] {
      color: ${theme.primaryTextColor};
      background-color: ${theme.primaryBackgroundColor};

      &:hover {
        background-color: color-mix(in srgb, ${theme.primaryBackgroundColor}, black 10%);
      }

      &:active {
        background-color: color-mix(in srgb, ${theme.primaryBackgroundColor}, black 20%);
      }
    }

    &[data-type='secondary'] {
      color: ${theme.secondaryTextColor};
      background-color: ${theme.secondaryBackgroundColor};
      border: 1px solid ${theme.secondaryBorderColor};

      &:hover {
        background-color: color-mix(in srgb, ${theme.secondaryBackgroundColor}, black 5%);
      }

      &:active {
        background-color: color-mix(in srgb, ${theme.secondaryBackgroundColor}, black 10%);
      }
    }

    &[data-type='danger'] {
      color: ${theme.dangerTextColor};
      background-color: ${theme.dangerBackgroundColor};

      &:hover {
        background-color: color-mix(in srgb, ${theme.dangerBackgroundColor}, black 15%);
      }

      &:active {
        background-color: color-mix(in srgb, ${theme.dangerBackgroundColor}, black 40%);
      }
    }
  }

  .close-button {
    align-self: flex-start;
    border: none;
    border-radius: ${theme.closeButtonBorderRadius};
    outline: none;
    padding: 0.3em;
    margin: 0;
    font-size: 1em;
    line-height: 0;
    background-color: transparent;
    cursor: pointer;
    padding: 0.3em;

    &:hover {
      background-color: light-dark(
        color-mix(in srgb, white, black 7%),
        color-mix(in srgb, black, white 7%)
      );
    }

    &:active {
      background-color: light-dark(
        color-mix(in srgb, #f0f0f0, black 10%),
        color-mix(in srgb, #f0f0f0, white 10%)
      );
    }
  }

  @keyframes dialog-fade-in {
    0% {
      top: 10%;
      opacity: 0;
    }
    100% {
      opacity: 1;
      transform: translateY(-50%);
    }
  }

  @keyframes dialog-fade-out {
    0% {
      opacity: 1;
      transform: translateY(-50%);
    }
    100% {
      top: 10%;
      opacity: 0;
    }
  }

  @keyframes backdrop-fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes backdrop-fade-out {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }
`.asStyleSheet();
