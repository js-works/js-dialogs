export { defaultDialogTexts, Translator };
export type { Locale, TextKey };

type Locale = string;

type TextKey = keyof typeof defaultDialogTexts;

const defaultDialogTexts = {
  cancel: 'Cancel',
  close: 'Close',
  no: 'No',
  ok: 'Ok',
  yes: 'Yes',

  titleInfo: 'Information',
  titleSuccess: 'Success',
  titleWarn: 'Warning',
  titleError: 'Error',
  titleConfirm: 'Confirmation',
  titleDecide: 'Decision',
  titleForm: 'Enter details',
} as const;

class Translator {
  readonly #getLocale;
  readonly #translate;

  constructor(
    getLocale: () => Locale = () => 'en-US',
    translate: (key: TextKey) => string = (key) => defaultDialogTexts[key] ?? key
  ) {
    this.#getLocale = getLocale;
    this.#translate = translate;
  }

  getLocale(): Locale {
    return this.#getLocale();
  }

  getText(key: TextKey): string {
    return this.#translate(key);
  }

  #getLocaleLookupChain(locale: string): string[] {
    const l = new Intl.Locale(locale);
    const chain = [l.toString()];

    if (l.script) {
      const scriptLocale = new Intl.Locale(l.language, {
        script: l.script,
      });
      chain.push(scriptLocale.toString());
    }

    if (chain[chain.length - 1] !== l.language) {
      chain.push(l.language);
    }

    return chain;
  }
}
