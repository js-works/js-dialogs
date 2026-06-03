export { Translator };
export type { Locale, TranslationKey };

type Locale = string;

type TranslationKey = keyof typeof defaultTranslations;

const defaultTranslations = {
  cancel: 'Cancel',
  confirmation: 'Confirmation',
  error: 'Error',
  information: 'Information',
  no: 'No',
  ok: 'Ok',
  question: 'Question',
  warning: 'Warning',
  yes: 'Yes',
} as const;

class Translator {
  readonly #getLocale;
  readonly #translate;

  constructor(
    getLocale: () => Locale = () => 'en-US',
    translate: (key: TranslationKey) => string = (key) => defaultTranslations[key] ?? key
  ) {
    this.#getLocale = getLocale;
    this.#translate = translate;
  }

  getLocale(): Locale {
    return this.#getLocale();
  }

  translate(key: TranslationKey): string {
    return this.#translate(key);
  }
}
