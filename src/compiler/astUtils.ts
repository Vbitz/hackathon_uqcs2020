import * as ast from './parser';

export function isIdentifer(node: ast.Node | undefined): node is ast.Identifer {
  return node !== undefined && node.kind === 'identifier';
}

export function isExpression(
  node: ast.Node | undefined
): node is ast.Expression {
  return node !== undefined && node.kind === 'expression';
}

export function isOperator(node: ast.Node | undefined): node is ast.Operator {
  return node !== undefined && node.kind === 'operation';
}

export function isTypeNode(node: ast.Node | undefined): node is ast.TypeNode {
  return node !== undefined && node.kind === 'type';
}

export function isStringLiteral(
  node: ast.Node | undefined
): node is ast.StringLiteral {
  return node !== undefined && node.kind === 'string';
}

export function isIntegerLiteral(
  node: ast.Node | undefined
): node is ast.NumberLiteral {
  return node !== undefined && node.kind === 'integer';
}

export function matchIdentifer(node: ast.Node, name: string): boolean {
  return isIdentifer(node) && node.name === name;
}

export function matchOperator(node: ast.Node, op: ast.OperatorKind): boolean {
  return isOperator(node) && node.value === op;
}
