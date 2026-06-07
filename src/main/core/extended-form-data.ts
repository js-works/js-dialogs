export { ExtendedFormData };

class ExtendedFormData extends FormData {
  toRecord(): Record<string, FormDataEntryValue | FormDataEntryValue[]> {
    const result: Record<string, FormDataEntryValue | FormDataEntryValue[]> = {};

    for (const [key, value] of this.entries()) {
      const existing = result[key];

      if (existing === undefined) {
        result[key] = value;
      } else if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        result[key] = [existing, value];
      }
    }

    return result;
  }
}
