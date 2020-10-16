import {generate} from 'pegjs';

const GRAMMAR = `
// This language is a pretty simple lisp

TopLevel "topLevel"
  = _ head:Expression tail:(_ Expression)* _ {
    return [head, ...tail.map((h) => h[1])]
  }

Expression "expression"
  = "(" _ head:Expression tail:(_ Expression)* _ ")" {
    return {
    	"kind": "expression",
        "children": [head, ...tail.map((h) => h[1])]
    };
  }
  / Operation { return {"kind": "operation", "value": text()}; }
  / value:Integer { return {"kind": "integer", value}; }
  / value:String { return {"kind": "string", value}; }
  / Identifier
  
Operation "operation"
  = "+" / "-" / ">"

Integer "integer"
  = _ [0-9]+ { return parseInt(text(), 10); }
  
String "string"
  = "\\"" [a-zA-Z, ]+ "\\"" { return JSON.parse(text()); }

Identifier "identifier"
  = [a-z]+ { return {kind: "identifier", name: text()}; }

_ "whitespace"
  = [ \\t\\n\\r]*
`;

interface BaseNode {}

export interface Identifer extends BaseNode {
  kind: 'identifier';
  name: string;
}

export interface Operator extends BaseNode {
  kind: 'operation';
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
  kind: 'string';
  value: string;
}

export interface NumberLiteral extends BaseNode {
  kind: 'integer';
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

  parseString(str: string): Node[] {
    return this.parser.parse(str, {startRule: 'TopLevel'});
  }
}
