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
  / Type
  / value:Integer { return {"kind": "integer", value}; }
  / value:String { return {"kind": "string", value}; }
  / Identifier
  
Operation "operation"
  = "+" / "-" / "*" / "/" / ">" / "<" / "==" / "!="

Type "type"
  = ":" id:Identifier { return {kind: "type", name: id.name}; }

Integer "integer"
  = _ [0-9]+ { return parseInt(text(), 10); }
  
String "string"
  = "\\"" char* "\\"" { return JSON.parse(text()); }

Identifier "identifier"
  = [a-zA-Z]+ { return {kind: "identifier", name: text()}; }

// From: https://github.com/pegjs/pegjs/blob/master/examples/json.pegjs
char
  = unescaped
  / escape
    sequence:(
        '"'
      / "\\\\"
      / "/"
      / "b" { return "\\b"; }
      / "f" { return "\\f"; }
      / "n" { return "\\n"; }
      / "r" { return "\\r"; }
      / "t" { return "\\t"; }
      / "u" digits:$(HEXDIG HEXDIG HEXDIG HEXDIG) {
          return String.fromCharCode(parseInt(digits, 16));
        }
    )
    { return sequence; }
    
unescaped
  = [^\\0-\\x1F\\x22\\x5C]

escape
  = "\\\\"
  
// ----- Core ABNF Rules -----

// See RFC 4234, Appendix B (http://tools.ietf.org/html/rfc4234).
DIGIT  = [0-9]
HEXDIG = [0-9a-f]i

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
  value: OperatorKind;
}

export interface TypeNode extends BaseNode {
  kind: 'type';
  name: string;
}

export enum OperatorKind {
  Plus = '+',
  Minus = '-',
  Multiply = '*',
  Divide = '/',
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
  | TypeNode
  | StringLiteral
  | NumberLiteral;

export class Parser {
  private parser = generate(GRAMMAR, {});

  constructor() {}

  parseString(str: string): Node[] {
    return this.parser.parse(str, {startRule: 'TopLevel'});
  }
}
