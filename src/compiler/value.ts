export interface UndefinedValue {
  kind: 'undefined';
}

export interface VariableValue {
  kind: 'variable';
  target: number;
}

export interface IntegerValue {
  kind: 'integer';
  value: number;
}

export interface StringValue {
  kind: 'string';
  value: string;
}

export interface BooleanValue {
  kind: 'boolean';
  value: boolean;
}

export interface ArrayValue {
  kind: 'array';
  values: Value[];
}

export type Value =
  | UndefinedValue
  | VariableValue
  | IntegerValue
  | StringValue
  | BooleanValue
  | ArrayValue;

export const undefined: Value = {kind: 'undefined'};

export function toNumber(value: Value): number {
  if (value.kind === 'integer') {
    return value.value;
  } else {
    throw new Error(`toNumber not implemented for ${value.kind}`);
  }
}

export function fromNumber(value: number): Value {
  return {kind: 'integer', value};
}

export function toString(value: Value): string {
  if (value.kind === 'string') {
    return value.value;
  } else {
    throw new Error(`toString not implemented for ${value.kind}`);
  }
}

export function fromString(value: string): Value {
  return {kind: 'string', value};
}

export function toBoolean(value: Value): boolean {
  if (value.kind === 'boolean') {
    return value.value;
  } else {
    throw new Error(`toBoolean not implemented for ${value.kind}`);
  }
}

export function fromBoolean(value: boolean): Value {
  return {kind: 'boolean', value};
}

export function fromVariable(target: number): Value {
  return {kind: 'variable', target};
}

export function newArray(): ArrayValue {
  return {kind: 'array', values: []};
}
