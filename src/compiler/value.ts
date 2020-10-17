export type Value = unknown;

export const undefined: Value = {kind: 'undefined'};

export function toNumber(value: Value): number {
  throw new Error('Not implemented');
}

export function fromNumber(num: number): Value {
  throw new Error('Not implemented');
}

export function toString(value: Value): string {
  throw new Error('Not implemented');
}

export function fromString(str: string): Value {
  throw new Error('Not implemented');
}
