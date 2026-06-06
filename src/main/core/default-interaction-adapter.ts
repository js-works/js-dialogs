import type { CustomDialogElement } from './custom-dialog-element';
import { h, HtmlContent, toHtmlElement } from './html';
import type { InteractionAdapter, Renderable } from './exports';

export { defaultDialogAdapter };

const defaultDialogAdapter: InteractionAdapter<HTMLElement> = {
  openDialog({
    //id,
    customDialogTagName,
    slotContents,
    properties,
    cancel,
  }) {
    const targetContainer = document.body;
    const customDialogElem: CustomDialogElement = h(customDialogTagName, properties);
    targetContainer.append(customDialogElem);

    customDialogElem.addEventListener('cancel', () => {
      cancel();
    });

    for (const [slotName, slotContent] of slotContents) {
      const nodes = convertToNodes(slotContent);
      customDialogElem.shadowRoot!.querySelector(`slot[name="${slotName}"]`)!.append(...nodes);
    }

    document.body.append(customDialogElem);

    return {
      updateDialog: (slotContents, proeprties) => {}, // TODO!!!!!
      closeDialog: () => customDialogElem.close(),
    };
  },

  renderForm(children, onSubmit) {
    const form = document.createElement('form');
    form.append(children);
    form.onsubmit = onSubmit;
    return form;
  },
};

function convertToNodes(content: Renderable<HTMLElement>): Node[] {
  if (content === undefined || content === null) {
    return [document.createTextNode('')];
  } else if (typeof content === 'string') {
    const lines = content.split(/\r?\n/);

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
