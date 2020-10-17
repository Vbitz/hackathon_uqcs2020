import * as ast from './parser';
import * as utils from './astUtils';
import {getLogger} from '../logger';

const log = getLogger('compiler:program');

enum StatementNames {
  Function = 'fn',
  Declaration = 'def',
}

export interface WhileStatement {
  kind: 'while';
  condition: Expression;
  body: Statement[];
}

export interface IfStatement {
  kind: 'if';
  condition: Expression;
  body: Statement[];
}

export interface ExpressionStatement {
  kind: 'expression';
  expression: Expression;
}

export interface ReturnStatement {
  kind: 'return';
  value: Expression | undefined;
}

export interface ContinueStatement {
  kind: 'continue';
}

export interface BreakStatement {
  kind: 'break';
}

export type Statement =
  | WhileStatement
  | IfStatement
  | ExpressionStatement
  | ReturnStatement
  | ContinueStatement
  | BreakStatement;

export interface BinaryExpression {
  kind: 'binaryExpression';
  op: ast.OperatorKind;
  lhs: Expression;
  rhs: Expression;
}

export interface AssignmentExpression {
  kind: 'assignmentExpression';
  target: Variable;
  value: Expression;
}

export interface BooleanLiteral {
  kind: 'boolean';
  value: boolean;
}

export interface CallExpression {
  kind: 'callExpression';
  target: FunctionDeclaration;
  args: Expression[];
}

export enum SystemCallKind {
  DebugWrite,
  DebugRead,
}

export interface SystemCall {
  kind: 'systemCall';
  type: SystemCallKind;
  args: Expression[];
}

export interface ArrayGetExpression {
  kind: 'arrayGetExpression';
  target: Variable;
  index: Expression;
}

export interface ArraySetExpression {
  kind: 'arraySetExpression';
  target: Variable;
  index: Expression;
  value: Expression;
}

export type Expression =
  | ast.StringLiteral
  | ast.NumberLiteral
  | BooleanLiteral
  | BinaryExpression
  | AssignmentExpression
  | Variable
  | CallExpression
  | SystemCall
  | ArrayGetExpression
  | ArraySetExpression;

function makeSystemCall(
  type: SystemCallKind,
  ...args: Expression[]
): SystemCall {
  return {kind: 'systemCall', type, args};
}

export enum PrimitiveTypeKind {
  Void = 'void',
  Char = 'char',
  String = 'string',
  Integer = 'int',
}

export interface PrimitiveType {
  kind: 'primitive';
  type: PrimitiveTypeKind;
}

export interface ArrayType {
  kind: 'array';
  elementType: Type;
  elementCount: number;
}

export type Type = PrimitiveType | ArrayType;

export class Variable {
  kind: 'variable' = 'variable';

  constructor(
    readonly name: string,
    readonly type: Type,
    readonly id: number
  ) {}
}

export class Scope {
  constructor(readonly owner: Program) {}

  resolveVariable(name: string): Variable | undefined {
    return this.owner.resolveVariable(name);
  }
}

export class FunctionDeclaration extends Scope {
  returnType: Type = {kind: 'primitive', type: PrimitiveTypeKind.Void};

  readonly statements: Statement[] = [];
  readonly parameters: Variable[] = [];
  readonly variables: Variable[] = [];

  constructor(owner: Program, readonly name: string) {
    super(owner);
  }

  addStatement(statement: Statement) {
    this.statements.push(statement);
  }

  setReturnType(type: Type) {
    this.returnType = type;
  }

  addParameter(name: string, type: Type) {
    this.parameters.push(this.owner.newVariable(name, type));
  }

  declareVariable(name: string, type: Type) {
    this.variables.push(this.owner.newVariable(name, type));
  }

  resolveVariable(name: string): Variable | undefined {
    for (const param of this.parameters) {
      if (param.name === name) {
        return param;
      }
    }

    for (const variable of this.variables) {
      if (variable.name === name) {
        return variable;
      }
    }

    return super.resolveVariable(name);
  }
}

export class Program {
  readonly functions = new Map<string, FunctionDeclaration>();
  readonly variables: Variable[] = [];

  private nextVariableId = 0;

  private deferredCalls: Array<() => void> = [];

  constructor() {}

  parseTree(ast: ast.Node[]) {
    for (const node of ast) {
      this.parseTopLevel(node);
    }

    for (const deferredCall of this.deferredCalls) {
      deferredCall();
    }

    this.deferredCalls = [];
  }

  getFunctionByName(name: string): FunctionDeclaration {
    const func = this.functions.get(name);

    if (func === undefined) {
      throw new Error('Function not found.');
    }

    return func;
  }

  resolveFunction(name: string): FunctionDeclaration | undefined {
    return this.functions.get(name);
  }

  resolveVariable(name: string): Variable | undefined {
    for (const variable of this.variables) {
      if (variable.name === name) {
        return variable;
      }
    }

    return undefined;
  }

  newVariable(name: string, type: Type): Variable {
    return new Variable(name, type, this.nextVariableId++);
  }

  private parseTopLevel(node: ast.Node) {
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
    } else if (name.name === StatementNames.Declaration) {
      this.parseVariableDeclaration(rest);
    } else {
      throw new Error('Statement not Recognized');
    }
  }

  private parseFunctionDeclaration(nodes: ast.Node[]) {
    const [signature, ...statements] = nodes;

    if (!utils.isExpression(signature)) {
      throw new Error(
        'The first child of a FunctionDeclaration must be an Expression'
      );
    }

    const [name, ...args] = signature.children;

    if (!utils.isIdentifer(name)) {
      throw new Error(
        'The first child of a FunctionDeclaration signature must be an Identifer'
      );
    }

    const returnType = args.pop();

    if (returnType === undefined) {
      throw new Error(
        'Functions must specify a return type as the last child of the signature'
      );
    }

    const newFunction = new FunctionDeclaration(this, name.name);

    newFunction.setReturnType(this.parseType(returnType));

    for (const arg of args) {
      if (!utils.isExpression(arg)) {
        throw new Error(
          'Each argument of a FunctionDeclaration must be an Expression'
        );
      }

      const [name, type] = arg.children;

      if (!utils.isIdentifer(name)) {
        throw new Error('The name of a Argument much be an Identifier');
      }

      newFunction.addParameter(name.name, this.parseType(type));
    }

    this.deferredCalls.push(() => {
      for (const statement of statements) {
        const parsedStatement = this.parseStatement(newFunction, statement);

        if (parsedStatement !== undefined) {
          newFunction.addStatement(parsedStatement);
        }
      }
    });

    this.declareFunction(newFunction);
  }

  private parseVariableDeclaration(nodes: ast.Node[]) {
    const [name, type] = nodes;

    if (!utils.isIdentifer(name)) {
      throw new Error('The name of a VariableDeclaration must be a Identifer');
    }

    this.declareVariable(name.name, this.parseType(type));
  }

  private parseType(node: ast.Node): Type {
    if (utils.isTypeNode(node)) {
      if (node.name === 'void') {
        return {kind: 'primitive', type: PrimitiveTypeKind.Void};
      } else if (node.name === 'char') {
        return {kind: 'primitive', type: PrimitiveTypeKind.Char};
      } else if (node.name === 'string') {
        return {kind: 'primitive', type: PrimitiveTypeKind.String};
      } else if (node.name === 'int') {
        return {kind: 'primitive', type: PrimitiveTypeKind.Integer};
      } else {
        throw new Error(`parseType primitive ${node.name} not implemented.`);
      }
    } else if (utils.isExpression(node)) {
      const children = node.children;
      const typeName = children[0];

      if (utils.isTypeNode(typeName) && typeName.name === 'array') {
        const [_, elementType, elementCount] = children;

        if (!utils.isIntegerLiteral(elementCount)) {
          throw new Error('The element count of an array must be a integer');
        }

        return {
          kind: 'array',
          elementType: this.parseType(elementType),
          elementCount: elementCount.value,
        };
      } else {
        throw new Error('parseType expression not implemented.');
      }
    } else {
      // log.log(node);

      throw new Error('parseType topLevel not implemented.');
    }
  }

  private parseStatement(
    func: FunctionDeclaration,
    node: ast.Node
  ): Statement | undefined {
    if (!utils.isExpression(node)) {
      throw new Error('All Statements are Expressions');
    }

    const nodes = node.children;

    if (utils.matchIdentifer(nodes[0], 'def')) {
      const [_, name, type] = nodes;

      if (!utils.isIdentifer(name)) {
        throw new Error(
          'The name of a VariableDeclaration must be a Identifer'
        );
      }

      func.declareVariable(name.name, this.parseType(type));

      return undefined;
    } else if (utils.matchIdentifer(nodes[0], 'while')) {
      const [_, condition, ...bodyNodes] = nodes;

      const conditionExpression = this.parseExpression(func, condition);

      const body: Statement[] = [];

      for (const statement of bodyNodes) {
        const parsedStatement = this.parseStatement(func, statement);

        if (parsedStatement !== undefined) {
          body.push(parsedStatement);
        }
      }

      return {kind: 'while', condition: conditionExpression, body};
    } else if (utils.matchIdentifer(nodes[0], 'if')) {
      const [_, condition, ...bodyNodes] = nodes;

      const conditionExpression = this.parseExpression(func, condition);

      const body: Statement[] = [];

      for (const statement of bodyNodes) {
        const parsedStatement = this.parseStatement(func, statement);

        if (parsedStatement !== undefined) {
          body.push(parsedStatement);
        }
      }

      return {kind: 'if', condition: conditionExpression, body};
    } else if (utils.matchIdentifer(nodes[0], 'return')) {
      const [_, value] = nodes;

      if (value !== undefined) {
        const valueExpr = this.parseExpression(func, value);

        return {kind: 'return', value: valueExpr};
      } else {
        return {kind: 'return', value: undefined};
      }
    } else if (utils.matchIdentifer(nodes[0], 'continue')) {
      return {kind: 'continue'};
    } else if (utils.matchIdentifer(nodes[0], 'break')) {
      return {kind: 'break'};
    } else {
      const expression = this.parseExpression(func, node);

      return {kind: 'expression', expression};
    }
  }

  private parseExpression(
    scope: Scope,
    node: ast.Node | undefined
  ): Expression {
    if (node === undefined) {
      throw new Error('Expression === undefined');
    }

    // log.log(node);

    if (utils.isStringLiteral(node)) {
      return node;
    } else if (utils.isIntegerLiteral(node)) {
      return node;
    } else if (utils.matchIdentifer(node, 'true')) {
      return {kind: 'boolean', value: true};
    } else if (utils.matchIdentifer(node, 'false')) {
      return {kind: 'boolean', value: false};
    } else if (utils.isExpression(node)) {
      const nodes = node.children;

      if (utils.matchIdentifer(nodes[0], 'write')) {
        const [_, ...argNodes] = nodes;

        const args = argNodes
          .map(val => this.parseExpression(scope, val))
          .reverse();

        return makeSystemCall(SystemCallKind.DebugWrite, ...args);
      } else if (utils.matchIdentifer(nodes[0], 'read')) {
        return makeSystemCall(SystemCallKind.DebugRead);
      } else if (utils.matchIdentifer(nodes[0], 'get')) {
        const [_, arrayNode, indexNode] = nodes;

        const array = this.parseExpression(scope, arrayNode);
        const index = this.parseExpression(scope, indexNode);

        if (array.kind !== 'variable') {
          throw new Error('The target of an arrayGet must be a Variable');
        }

        return {kind: 'arrayGetExpression', target: array, index};
      } else if (utils.matchIdentifer(nodes[0], 'set')) {
        const [_, arrayNode, indexNode, valueNode] = nodes;

        const array = this.parseExpression(scope, arrayNode);
        const index = this.parseExpression(scope, indexNode);
        const value = this.parseExpression(scope, valueNode);

        if (array.kind !== 'variable') {
          throw new Error('The target of an arrayGet must be a Variable');
        }

        return {kind: 'arraySetExpression', target: array, index, value};
      } else if (utils.matchIdentifer(nodes[0], 'assign')) {
        const [_, targetNode, valueNode] = nodes;

        const target = this.parseExpression(scope, targetNode);
        const value = this.parseExpression(scope, valueNode);

        if (target.kind !== 'variable') {
          throw new Error('Assignments must target a variable');
        }

        // TODO(joshua): Type Checking

        return {kind: 'assignmentExpression', target, value};
      } else if (utils.isOperator(nodes[1])) {
        const lhs = this.parseExpression(scope, nodes[0]);
        const rhs = this.parseExpression(scope, nodes[2]);

        return {kind: 'binaryExpression', op: nodes[1].value, lhs, rhs};
      } else {
        // Try to resolve a function and execute it.
        const [functionName, ...argumentNodes] = nodes;

        if (!utils.isIdentifer(functionName)) {
          throw new Error(
            'The first child of a function call must be an Identifer.'
          );
        }

        const func = this.resolveFunction(functionName.name);

        if (func === undefined) {
          throw new Error(`Function ${functionName.name} not found.`);
        }

        const args = [];

        for (const arg of argumentNodes) {
          args.push(this.parseExpression(scope, arg));
        }

        return {kind: 'callExpression', target: func, args};
      }
    } else if (utils.isIdentifer(node)) {
      // Try to resolve the variable in the local scope.
      const tryResolve = scope.resolveVariable(node.name);

      if (tryResolve !== undefined) {
        return tryResolve;
      }
    }

    throw new Error('parseExpression not implemented.');
  }

  private declareFunction(func: FunctionDeclaration) {
    this.functions.set(func.name, func);
  }

  private declareVariable(name: string, type: Type) {
    this.variables.push(this.newVariable(name, type));
  }
}
