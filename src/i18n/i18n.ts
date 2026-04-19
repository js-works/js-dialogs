export { createI18n, createTextCategory, getI18n, initI18n, LocalizeController };

export type {
  ChangeListener,
  Locale,
  LocalizeControllerHost,
  Namespace,
  Translation,
  TranslationKey,
  TranslationMap,
  TranslationBundle,
  Unsubscribe,
};

// === types =========================================================

type Locale = string;
type Namespace = string;
type TranslationKey = string;
type Unsubscribe = () => void;
type ChangeListener = () => void;
type Translation = string | (<T extends Record<string, unknown>>(param: T) => string);
type TranslationMap = Record<string, Translation>;

type TranslationParams<T> = T extends (params: Record<string, any>, localizer: Localizer) => string
  ? Parameters<T>[0]
  : never;

type SimpleTranslationKey<K, T> = T extends (
  params: Record<string, any>,
  localizer: Localizer
) => string
  ? never
  : K extends string
    ? K
    : never;

type TranslationBundle = {
  namespace: string;
  translations: TranslationMap;
  partial: boolean;
};

type TextCategory<T extends TranslationMap> = {
  getNamespace(): string;
  full(translations: T): TranslationBundle;
  partial(translations: Partial<T>): TranslationBundle;
};

type I18n = {
  getText<T extends TranslationMap, K extends keyof T>(
    locale: Locale,
    category: TextCategory<T>,
    key: K,
    params: TranslationParams<T[K]>
  ): string;

  getText<T extends TranslationMap, K extends keyof T>(
    locale: Locale,
    category: TextCategory<T>,
    key: SimpleTranslationKey<K, T[K]>
  ): string;

  getLocalizer(locale: Locale): Localizer;
  addTexts(texts: Record<Locale, TranslationBundle[]>): void;
  getPrimaryLocale(): Locale;
  onPrimaryLocaleChange(listener: ChangeListener): Unsubscribe;
  getFallbackLocales(): Locale[];
  onFallbackLocalesChange(listener: ChangeListener): Unsubscribe;
};

type I18nConfig = {
  onAddText?(locale: Locale, namespace: Namespace, key: TranslationKey): void;
  // More to come in futue.
};

type Localizer = {
  getText<T extends TranslationMap>(category: TextCategory<T>, key: keyof T): string | null;
  numberFormat(option: Intl.NumberFormatOptions): Intl.NumberFormat;
  dateTimeFormat(option: Intl.DateTimeFormatOptions): Intl.DateTimeFormat;
  localizer(locale: Locale): Localizer;
};

type LocalizeControllerHost = {
  requestUpdate(): void;
  addController(controller: LocalizeController): void;
};

// === constants =====================================================

let documentLocale = 'en-US';
let mutationObserver: MutationObserver | null = null;

if (isClientSide()) {
  documentLocale = document.documentElement.getAttribute('lang') || 'en-US';

  mutationObserver = new MutationObserver(() => {
    documentLocale = document.documentElement.getAttribute('lang') || 'en-US';
  });

  mutationObserver.observe(document.getRootNode(), {
    attributes: true,
    attributeFilter: ['lang'],
  });
}

// === things required for default I18n object =======================

let innerI18n: I18n | null = null;
let i18nConfig: I18nConfig | null = null;
const translationsToAdd: Record<Locale, TranslationBundle[]>[] = [];

const getInnerI18n: () => I18n = () => {
  if (innerI18n === null) {
    innerI18n = createI18n(i18nConfig ?? {});

    for (const translations of translationsToAdd) {
      innerI18n.addTexts(translations);
    }

    translationsToAdd.length = 0;
  }

  return innerI18n;
};

const i18n: I18n = {
  addTexts: (texts) => {
    if (innerI18n == null) {
      translationsToAdd.push(texts);
    } else {
      getInnerI18n().addTexts(texts);
    }
  },

  getText(locale, category, key, params = null) {
    return getInnerI18n().getText(locale, category, key, params as any);
  },

  getLocalizer: (locale) => getInnerI18n().getLocalizer(locale),
  getPrimaryLocale: () => getInnerI18n().getPrimaryLocale(),
  onPrimaryLocaleChange: (listener) => getInnerI18n().onPrimaryLocaleChange(listener),
  getFallbackLocales: () => getInnerI18n().getFallbackLocales(),
  onFallbackLocalesChange: (listener) => getInnerI18n().onFallbackLocalesChange(listener),
};

// === exported functions ============================================

function getI18n() {
  return i18n;
}

function createTextCategory<T extends TranslationMap>(namespace: string): TextCategory<T> {
  return freeze({
    getNamespace: () => namespace,
    full: (translations) => freeze({ namespace, translations, partial: false }),
    partial: (translations) =>
      freeze({ namespace, translations: translations as TranslationMap, partial: true }),
  });
}

function createI18n(config: I18nConfig = {}): I18n {
  return new I18nImpl(config);
}

function initI18n(config: I18nConfig) {
  if (i18nConfig !== null) {
    throw new Error("Function 'i18n' can only be called once.");
  }

  if (innerI18n != null) {
    throw new Error("Function 'initI18n' has already been initialized.");
  }

  i18nConfig = config;
}

// === internal functions ============================================

function createRecord() {
  return Object.create(null);
}

function freeze<T extends Record<string, any>>(obj: T): Readonly<T> {
  return Object.freeze(obj);
}

function isClientSide() {
  return (
    typeof window === 'object' &&
    globalThis === window &&
    typeof document === 'object' &&
    typeof document.documentElement === 'object' &&
    typeof MutationObserver === 'function'
  );
}

// === internal classes ==============================================

class I18nImpl implements I18n {
  #config: I18nConfig;
  #primaryLocaleListners: ChangeListener[] = [];
  #fallbackLocalesListners: ChangeListener[] = [];
  #dict: Record<Locale, Record<Namespace, Record<string, Translation>>> = createRecord();
  #localizerByLocale: Record<Locale, Localizer> = createRecord();

  constructor(config: I18nConfig) {
    this.#config = config;
  }

  addTexts(texts: Record<Locale, TranslationBundle[]>): void {
    for (const [locale, bundles] of Object.entries(texts)) {
      let byNamespace = this.#dict![locale];

      if (!byNamespace) {
        byNamespace = createRecord();
        this.#dict[locale] = byNamespace;
      }

      for (const bundle of bundles) {
        const namespace = bundle.namespace;

        for (const [key, value] of Object.entries(bundle.translations)) {
          let translations = byNamespace[namespace];
          translations[key] = value;

          if (this.#config.onAddText) {
            this.#config.onAddText(locale, namespace, key);
          }
        }
      }
    }
  }

  getText<T extends TranslationMap, K extends keyof T>(
    locale: Locale,
    category: TextCategory<T>,
    key: K,
    params: TranslationParams<T[K]>
  ): string;

  getText<T extends TranslationMap, K extends keyof T>(
    locale: Locale,
    category: TextCategory<T>,
    key: SimpleTranslationKey<K, T[K]>
  ): string;

  getText(
    locale: Locale,
    category: TextCategory<any>,
    key: string,
    params: Record<string, Translation> | null = null
  ) {
    return this.#getText(new Intl.Locale(locale), category.getNamespace(), key, params ?? null);
  }

  getLocalizer(locale: Locale): Localizer {
    let localizer = this.#localizerByLocale[locale];

    if (!localizer) {
      localizer = new LocalizerImpl(this, () => locale);
      this.#localizerByLocale[locale] = localizer;
    }

    return localizer;
  }

  getPrimaryLocale(): Locale {
    return 'en-US';
  }

  onPrimaryLocaleChange(listener: ChangeListener): Unsubscribe {
    this.#primaryLocaleListners.push(listener);
    return () => {};
  }

  getFallbackLocales(): Locale[] {
    return [];
  }

  onFallbackLocalesChange(listener: ChangeListener): Unsubscribe {
    this.#fallbackLocalesListners.push(listener);
    return () => {};
  }

  #getText(
    locale: Intl.Locale,
    namespace: Namespace,
    key: TranslationKey,
    params: Record<string, Translation> | null
  ): string {
    const base = locale.baseName;
    const language = locale.language.toLowerCase() ?? '';
    const region = locale.region?.toLowerCase() ?? '';
    const languageAndRegion = language + (region ? '-' : '') + region;
    const localesToTry: Locale[] = [base];

    if (languageAndRegion !== base) {
      localesToTry.push(languageAndRegion);
    }

    if (language != languageAndRegion) {
      localesToTry.push(language);
    }

    let ret: string | null = null;

    for (const localeToTry of localesToTry) {
      ret = this.#getTextByExactLocale(localeToTry, namespace, key, params);

      if (ret !== null) {
        break;
      }
    }

    return ret != null ? ret : key;
  }

  #getTextByExactLocale(
    locale: string,
    namespace: Namespace,
    key: TranslationKey,
    params: Record<string, Translation> | null
  ): string | null {
    let rec: Record<string, any> = this.#dict[locale]; // TODO

    if (!rec) {
      return null;
    }

    rec = this.#dict[namespace];

    if (!rec) {
      return null;
    }

    const translation = rec[key];

    if (params === null) {
      if (typeof translation === 'string') {
        return translation;
      }

      if (typeof translation !== 'function') {
        return key;
      }

      return key;
    }

    return translation(params);
  }
}

class LocalizerImpl implements Localizer {
  #i18n: I18n;
  #getLocale: () => Locale;

  constructor(i18n: I18n, getLocale: () => Locale) {
    this.#i18n = i18n;
    this.#getLocale = getLocale;
  }

  getText<T extends TranslationMap, K extends keyof T & string>(
    category: TextCategory<T>,
    key: K,
    params: TranslationParams<T[K]>
  ): string;

  getText<T extends TranslationMap, K extends keyof T & string>(
    category: TextCategory<T>,
    key: SimpleTranslationKey<K, T[K]>
  ): string;

  getText(
    category: TextCategory<any>,
    key: string,
    params: Record<string, Translation> | null = null
  ) {
    return this.#i18n.getText(this.#getLocale(), category, key as string, params || null);
  }

  numberFormat(options: Intl.NumberFormatOptions): Intl.NumberFormat {
    return new Intl.NumberFormat(this.#getLocale(), options);
  }

  dateTimeFormat(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
    return new Intl.DateTimeFormat(this.#getLocale(), options);
  }

  localizer(locale: Locale): Localizer {
    return this.#i18n.getLocalizer(locale);
  }
}

// === exported classes ==============================================

class LocalizeController extends LocalizerImpl {
  #host: LocalizeControllerHost;
  #locale = getI18n().getPrimaryLocale();
  #unsubscribe: Unsubscribe | null = null;

  constructor(host: LocalizeControllerHost, i18n: I18n = getI18n()) {
    super(i18n, () => this.#locale);
    this.#host = host;
    host.addController(this);
  }

  hostConnected(): void {
    const unsubscribe = this.#unsubscribe;

    if (unsubscribe) {
      this.#unsubscribe = null;
      unsubscribe();
    }

    const update = () => this.#host.requestUpdate();
    const unsubscribe1 = getI18n().onPrimaryLocaleChange(update);
    const unsubscribe2 = getI18n().onFallbackLocalesChange(update);

    this.#unsubscribe = () => {
      unsubscribe1();
      unsubscribe2();
    };
  }

  hostDisconnected(): void {
    const unsubscribe = this.#unsubscribe;

    if (unsubscribe) {
      this.#unsubscribe = null;
      unsubscribe();
    }
  }
}
