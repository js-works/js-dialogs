import { toHtmlElement, HtmlContent } from "./html"

export { toNode }

function toNode(content: Node | string | number | HtmlContent | null | undefined): Node {
  if (content === null || content === undefined) {
    return document.createTextNode('');
  } else if (content instanceof Node) {
    return content;
  } else if (typeof content === 'number') {
    return document.createTextNode(content.toString());
  } else if (content instanceof HtmlContent) {
    return toHtmlElement(content.asString());
  }

  return document.createTextNode(content);
}