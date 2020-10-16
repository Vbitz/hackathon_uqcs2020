import * as ast from './parser';
import * as utils from './astUtils';

enum StatementNames {
  Function = 'fn',
}

export enum SystemCallKind {
  DebugPrint,
}

export interface SystemCall {
  kind: 'systemCall';
  type: SystemCallKind;
  args: Expression[];
}

export type Statement = SystemCall;

export type Expression = ast.StringLiteral | ast.NumberLiteral;

function makeSystemCall(
  type: SystemCallKind,
  ...args: Expression[]
): SystemCall {
  return {kind: 'systemCall', type, args};
}

export class FunctionDeclaration {
  readonly statements: Statement[] = [];

  constructor(readonly name: string) {}

  addStatement(statement: Statement) {
    this.statements.push(statement);
  }
}

export class Program {
  private functions = new Map<string, FunctionDeclaration>();

  constructor() {}

  parseTree(ast: ast.Node[]) {
    for (const node of ast) {
      this.parseNode(node);
    }
  }

  emit(): unknown {
    return;
  }

  getFunctionByName(name: string): FunctionDeclaration {
    const func = this.functions.get(name);

    if (func === undefined) {
      throw new Error('Function not found.');
    }

    return func;
  }

  private parseNode(node: ast.Node) {
    if (!utils.isExpression(node)) {
      throw new Error('Top-level node must be an expression');
    }

    const [name, ...rest] = node.children;

    if (!utils.isIdentifer(name)) {
      throw new Error(
        'All statements have a string literal as the first child'
      );
    }

    if (name.name === StatementNames.Function) {
      this.parseFunctionDeclaration(rest);
    } else {
      throw new Error('Statement not Recognized');
    }
  }

  private parseFunctionDeclaration(nodes: ast.Node[]) {
    const [name, ...statements] = nodes;

    if (!utils.isIdentifer(name)) {
      throw new Error(
        'The first child of a FunctionDeclaration must be an Identifer'
      );
    }

    const newFunction = new FunctionDeclaration(name.name);

    for (const statement of statements) {
      newFunction.addStatement(this.parseStatement(statement));
    }

    this.declareFunction(newFunction);
  }

  private parseStatement(node: ast.Node): Statement {
    if (!utils.isExpression(node)) {
      throw new Error('All Statements are Expressions');
    }

    const nodes = node.children;

    if (utils.matchIdentifer(nodes[0], 'print')) {
      return makeSystemCall(
        SystemCallKind.DebugPrint,
        this.parseExpression(nodes[1])
      );
    } else {
      throw new Error('Not Implemented');
    }
  }

  private parseExpression(node: ast.Node | undefined): Expression {
    if (node === undefined) {
      throw new Error('Expression === undefined');
    }

    if (utils.isStringLiteral(node)) {
      return node;
    } else if (utils.isIntegerLiteral(node)) {
      return node;
    } else {
      throw new Error('Not Implemented');
    }
  }

  private declareFunction(func: FunctionDeclaration) {
    this.functions.set(func.name, func);
  }
}
