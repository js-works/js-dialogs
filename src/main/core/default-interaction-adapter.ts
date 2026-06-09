import type { CustomDialogElement } from './custom-dialog-element';
import { h, HtmlContent, toHtmlElement } from './html';
import type { InteractionAdapter, Renderable } from './exports';

export { defaultDialogAdapter };

const defaultDialogAdapter: InteractionAdapter<Node> = {
  openDialog({ customDialogTagName, properties, styles, slotContents, cancel }) {
    const targetContainer = document.body;
    const customDialogElem: CustomDialogElement = h(customDialogTagName, properties);
    targetContainer.append(customDialogElem);

    customDialogElem.addEventListener('cancel', () => {
      cancel();
    });

    if (styles) {
      const styleElem = document.createElement('style');
      styleElem.innerText = styles;
      customDialogElem.append(styleElem);
    }

    for (const [slotName, slotContent] of slotContents) {
      const nodes = convertToNodes(slotContent);
      const divElem = document.createElement('div');
      divElem.slot = slotName;
      divElem.append(...nodes);
      customDialogElem.append(divElem);
    }

    document.body.append(customDialogElem);

    return {
      updateDialog: (slotContents, proeprties) => {}, // TODO!!!!!
      closeDialog: () => customDialogElem.close(),
    };
  },

  renderSpinner() {
    return 'Loading....';
  },

  renderForm(children, onSubmit) {
    const form = document.createElement('form');
    convertToNodes(children).forEach((child) => form.append(child));
    form.onsubmit = onSubmit;
    return form;
  },
};

function convertToNodes(content: Renderable<Node>): Node[] {
  if (content === undefined || content === null) {
    return [document.createTextNode('')];
  } else if (typeof content === 'string') {
    const lines = content.split(/\r\n|[\r\n]/);

    return lines.length === 1
      ? [document.createTextNode(lines[0])]
      : [h('span', null, ...lines.map((line) => h('div', null, line)))];
  } else if (typeof content === 'number') {
    return [document.createTextNode(content.toString())];
  } else if (content instanceof HtmlContent) {
    return [toHtmlElement((content as HtmlContent).asString())];
  }

  return [content];
}
