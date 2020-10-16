import * as ast from './parser';

export function isIdentifer(node: ast.Node): node is ast.Identifer {
  return node.kind === 'identifier';
}

export function isExpression(node: ast.Node): node is ast.Expression {
  return node.kind === 'expression';
}

export function isOperator(node: ast.Node): node is ast.Operator {
  return node.kind === 'operation';
}

export function isStringLiteral(node: ast.Node): node is ast.StringLiteral {
  return node.kind === 'string';
}

export function isIntegerLiteral(node: ast.Node): node is ast.NumberLiteral {
  return node.kind === 'integer';
}

export function matchIdentifer(node: ast.Node, name: string): boolean {
  return isIdentifer(node) && node.name === name;
}
