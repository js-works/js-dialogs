export { createToggle };
export type { Toggle, ToggleListener, ToggleSetter, ToggleUnsubscribe };

type ToggleListener = (value: boolean) => void;
type ToggleUnsubscribe = () => void;
type ToggleSetter = (value: boolean) => void;

type Toggle = {
  readonly value: boolean;
  readonly onChange: (listener: ToggleListener) => ToggleUnsubscribe;
};

function createToggle(initialValue = false): [Toggle, ToggleSetter] {
  let value = initialValue;
  const listeners = new Set<ToggleListener>();

  const toggle: Toggle = Object.freeze({
    get value() {
      return value;
    },

    onChange(listener): ToggleUnsubscribe {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  });

  const setToggleValue = (nextValue: boolean) => {
    if (value === nextValue) {
      return;
    }

    value = nextValue;

    for (const listener of listeners) {
      listener(value);
    }
  };

  return [toggle, setToggleValue];
}
