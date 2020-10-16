import {generate} from 'pegjs';

const GRAMMAR = `
// This language is a pretty simple lisp

Expression "expression"
  = "(" _ head:Expression tail:(_ Expression)* _ ")" {
    return {
    	"kind": "expression",
        "children": [head, ...tail.map((h) => h[1])]
    };
  }
  / Operation { return {"kind": "op", "value": text()}; }
  / value:Integer { return {"kind": "int", value}; }
  / value:String { return {"kind": "str", value}; }
  / Identifier
  
Operation "operation"
  = "+" / "-" / ">"

Integer "integer"
  = _ [0-9]+ { return parseInt(text(), 10); }
  
String "string"
  = "\\"" [a-zA-Z, ]+ "\\"" { return JSON.parse(text()); }

Identifier "identifier"
  = [a-z]+ { return {kind: "id", name: text()}; }

_ "whitespace"
  = [ \\t\\n\\r]*
`;

interface BaseNode {}

export interface Identifer extends BaseNode {
  kind: 'id';
  name: string;
}

export interface Operator extends BaseNode {
  kind: 'op';
  type: OperatorKind;
}

export enum OperatorKind {
  Plus = '+',
  Minus = '-',
  GreaterThan = '>',
  LesserThan = '<',
  Equals = '==',
  NotEquals = '!=',
}

export interface Expression extends BaseNode {
  kind: 'expression';
  children: Node[];
}

export interface StringLiteral extends BaseNode {
  kind: 'str';
  value: string;
}

export interface NumberLiteral extends BaseNode {
  kind: 'int';
  value: number;
}

export type Node =
  | Identifer
  | Expression
  | Operator
  | StringLiteral
  | NumberLiteral;

export class Parser {
  private parser = generate(GRAMMAR, {});

  constructor() {}

  parseString(str: string): Node {
    return this.parser.parse(str, {startRule: 'Expression'});
  }
}
