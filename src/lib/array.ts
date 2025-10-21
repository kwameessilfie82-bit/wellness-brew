export function getFirstNItems<T>(a: T[], n: number): T[] {
  return a.slice(0, n);
}

/**
 * Returns a new array containing only the unique values from the input array.
 * Uniqueness is determined by deep equality.
 *
 * @param arr - The array of values to be filtered.
 * @returns A new array with duplicates removed.
 */
export function getUniqueValues<T>(arr: T[]): T[] {
  const seen = new Map<string, T[]>();
  const result: T[] = [];

  for (const item of arr) {
    const hash = deepHash(item);
    if (seen.has(hash)) {
      const itemsWithHash = seen.get(hash)!;
      let duplicateFound = false;
      for (const existing of itemsWithHash) {
        if (deepEqual(existing, item)) {
          duplicateFound = true;
          break;
        }
      }
      if (!duplicateFound) {
        itemsWithHash.push(item);
        result.push(item);
      }
    } else {
      seen.set(hash, [item]);
      result.push(item);
    }
  }

  return result;
}

export function intersection<T>(a: T[], b: T[]): T[] {
  return a.filter((x) => b.includes(x));
}

/**
 * Performs deep equality check for any two values.
 * This recursively checks primitives, arrays, and plain objects.
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null || a === undefined || b === undefined)
    return false;

  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual((a as unknown[])[i], (b as unknown[])[i])) return false;
    }
    return true;
  }

  if (typeof a === "object") {
    if (typeof b !== "object") return false;
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const aKeys = Object.keys(aObj).sort();
    const bKeys = Object.keys(bObj).sort();
    if (aKeys.length !== bKeys.length) return false;
    for (let i = 0; i < aKeys.length; i++) {
      if (aKeys[i] !== bKeys[i]) return false;
      if (!deepEqual(aObj[aKeys[i]], bObj[bKeys[i]])) return false;
    }
    return true;
  }

  return false;
}

/**
 * Computes a stable hash string for any value using deep inspection.
 * This function recursively builds a string for primitives, arrays, and objects.
 * It uses a cache (WeakMap) to avoid rehashing the same object twice, which is
 * particularly beneficial if an object appears in multiple places.
 */
function deepHash(value: unknown, cache = new WeakMap<object, string>()): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  const type = typeof value;
  if (type === "number" || type === "boolean" || type === "string") {
    return `${type}:${value.toString()}`;
  }
  if (type === "function") {
    const fn = value as (...args: unknown[]) => unknown;
    return `function:${fn.toString()}`;
  }

  if (type === "object") {
    const obj = value as Record<string, unknown> | unknown[] | object;
    if (cache.has(obj as object)) {
      return cache.get(obj as object)!;
    }
    let hash: string;
    if (Array.isArray(obj)) {
      hash = `array:[${(obj as unknown[]).map((v) => deepHash(v, cache)).join(",")}]`;
    } else {
      const rec = obj as Record<string, unknown>;
      const keys = Object.keys(rec).sort();
      const props = keys
        .map((k) => `${k}:${deepHash(rec[k], cache)}`)
        .join(",");
      hash = `object:{${props}}`;
    }
    cache.set(obj as object, hash);
    return hash;
  }

  return `${type}:${value.toString()}`;
}

// TODO: not used at the moment
// export function flatten<T>(a: T[][]): T[] {
//   return a.flat();
// }
