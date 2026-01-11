import { css, DialogController } from '../core/dialog-controller.js';

export { dialogs };

const dialogs = new DialogController({
  getStyles(tagName) {
    const ret = css`
      ${tagName} {
      }
    `;
    console.log(ret.getCssText());
    return ret;
  },
});
