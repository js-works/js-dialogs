export { AbortError };

class AbortError extends DOMException {
  constructor(message: string = 'Aborted') {
    super(message, 'AbortError');
  }
}
