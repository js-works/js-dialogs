export { svg, SvgContent }

class SvgContent {
  #content;

  constructor(content: string) {
    this.#content = content;
  }

  getSvgText() {
    return this.#content;
  }
}

function svg(strings: TemplateStringsArray, ...values: unknown[]) {
  const text = strings.reduce((result, str, i) => `${result}${str}${values[i] || ''}`, '');

  return new SvgContent(text);
}
