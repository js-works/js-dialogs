import { toHtmlElement, HtmlContent } from './html';

export { toNode };

function toNode(content: Node | string | number | HtmlContent | null | undefined): Node {
  if (content === null || content === undefined) {
    return document.createTextNode('');
  }

  if (content instanceof Node) {
    return content;
  }

  if (typeof content === 'number') {
    return document.createTextNode(content.toString());
  }

  if (content instanceof HtmlContent) {
    return toHtmlElement(content.asString());
  }

  return document.createTextNode(content);
}
