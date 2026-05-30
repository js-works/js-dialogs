export { isResultObject };
export type { Result };

type Result<T, E = any> = { ok: true; value: T } | { ok: false; error: E };

function isResultObject(value: any): value is Result<unknown> {
  if (value === null || typeof value !== 'object' || typeof value.ok !== 'boolean') {
    return false;
  }

  const keys = Object.keys(value).sort();

  if (keys.length !== 2) {
    return false;
  }

  return value.ok
    ? keys[0] === 'ok' && keys[1] === 'value'
    : keys[0] === 'error' && keys[1] === 'ok';
}
