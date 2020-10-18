import {getLogger} from '../logger';
import {OperatorKind} from './parser';
import {
  Expression,
  FunctionDeclaration,
  Program,
  Statement,
  SystemCallKind,
  Variable,
} from './program';

const log = getLogger('compiler:codeGen.byteCode');

export type BlockId = number;

interface BaseInstruction {}

export interface PushStringInstruction extends BaseInstruction {
  kind: 'pushString';
  value: string;
}

export interface PushBooleanInstruction extends BaseInstruction {
  kind: 'pushBoolean';
  value: boolean;
}

export interface PushIntegerInstruction extends BaseInstruction {
  kind: 'pushInteger';
  value: number;
}

export interface PushUndefinedInstruction extends BaseInstruction {
  kind: 'pushUndefined';
}

export interface PushVariableInstruction extends BaseInstruction {
  kind: 'pushVariable';
  variable: number;
}

export interface AssignVariableInstruction extends BaseInstruction {
  kind: 'assignVariable';
}

export interface AssignVariableDirectInstruction extends BaseInstruction {
  kind: 'assignVariableDirect';
  target: number;
}

export interface BinaryExpressionInstruction extends BaseInstruction {
  kind: 'binaryExpression';
  op: OperatorKind;
}

export interface ArrayGetInstruction extends BaseInstruction {
  kind: 'arrayGet';
}

export interface ArraySetInstruction extends BaseInstruction {
  kind: 'arraySet';
}

export interface CallInstruction extends BaseInstruction {
  kind: 'call';
  target: string;
}

export interface SystemCallInstruction extends BaseInstruction {
  kind: 'systemCall';
  type: SystemCallKind;
  length: number;
}

export interface EnterBlockInstruction extends BaseInstruction {
  kind: 'enterBlock';
  block: BlockId;
}

export interface ExitBlockInstruction extends BaseInstruction {
  kind: 'exitBlock';
}

export interface BranchEnterInstruction extends BaseInstruction {
  kind: 'branchEnter';
  block: BlockId;
}

export interface BranchReturnInstruction extends BaseInstruction {
  kind: 'branchReturn';
}

export interface PopInstruction extends BaseInstruction {
  kind: 'pop';
}

export interface ReturnInstruction extends BaseInstruction {
  kind: 'return';
}

export interface ContinueInstruction extends BaseInstruction {
  kind: 'continue';
}

export interface BreakInstruction extends BaseInstruction {
  kind: 'break';
}

export type ByteCodeInstruction =
  | PushStringInstruction
  | PushBooleanInstruction
  | PushIntegerInstruction
  | PushUndefinedInstruction
  | PushVariableInstruction
  | AssignVariableInstruction
  | AssignVariableDirectInstruction
  | BinaryExpressionInstruction
  | ArrayGetInstruction
  | ArraySetInstruction
  | CallInstruction
  | SystemCallInstruction
  | EnterBlockInstruction
  | ExitBlockInstruction
  | BranchEnterInstruction
  | BranchReturnInstruction
  | PopInstruction
  | ReturnInstruction
  | ContinueInstruction
  | BreakInstruction;

export enum ByteCodeBlockKind {
  Function,
  If,
  While,
}

export interface ByteCodeBlock {
  kind: ByteCodeBlockKind;
  instructions: ByteCodeInstruction[];
}

export interface ByteCodeFunction {
  entryBlock: number;
  variables: number[];
}

export interface ByteCode {
  topLevelVariables: number[];
  functions: Record<string, ByteCodeFunction>;
  blocks: Record<BlockId, ByteCodeBlock>;
}

class GeneratorScope {
  constructor(readonly parent: GeneratorScope | undefined) {}

  newScope(): GeneratorScope {
    return new GeneratorScope(this);
  }
}

export class ByteCodeGenerator {
  private nextBlockId = 0;

  private blocks: Record<BlockId, ByteCodeBlock> = {};

  constructor(readonly program: Program) {}

  generate(): ByteCode {
    const topScope = new GeneratorScope(undefined);

    const functions: Record<string, ByteCodeFunction> = {};

    for (const func of this.program.functions.values()) {
      const functionScope = topScope.newScope();

      const result = this.emitFunction(functionScope, func);

      functions[func.name] = result;
    }

    return {
      blocks: this.blocks,
      functions,
      topLevelVariables: this.program.variables.map(v => v.id),
    };
  }

  private emit(target: BlockId, instr: ByteCodeInstruction): void {
    const block = this.blocks[target];

    if (block === undefined) {
      throw new Error('Block not found');
    }

    block.instructions.push(instr);
  }

  private newBlock(kind: ByteCodeBlockKind): BlockId {
    const newBlock: ByteCodeBlock = {
      kind,
      instructions: [],
    };

    const newBlockId = this.nextBlockId++;

    this.blocks[newBlockId] = newBlock;

    return newBlockId;
  }

  private emitFunction(
    scope: GeneratorScope,
    func: FunctionDeclaration
  ): ByteCodeFunction {
    const functionBlock = this.newBlock(ByteCodeBlockKind.Function);

    for (const param of func.parameters.reverse()) {
      this.emit(functionBlock, {
        kind: 'assignVariableDirect',
        target: param.id,
      });
    }

    for (const statement of func.statements) {
      this.emitStatement(scope, functionBlock, statement);
    }

    this.finalizeFunction(functionBlock);

    return {
      entryBlock: functionBlock,
      variables: func.variables.map(v => v.id),
    };
  }

  private finalizeFunction(blockId: BlockId) {
    const block = this.blocks[blockId];

    // If we already emitted a return then don't emit another one.
    if (block.instructions[block.instructions.length - 1].kind === 'return') {
      return;
    }

    this.emit(blockId, {
      kind: 'pushUndefined',
    });

    this.emit(blockId, {
      kind: 'return',
    });
  }

  private emitStatement(
    scope: GeneratorScope,
    target: BlockId,
    statement: Statement
  ) {
    if (statement.kind === 'while') {
      const block = this.newBlock(ByteCodeBlockKind.While);

      this.emitExpression(scope, block, statement.condition);

      this.emit(block, {kind: 'branchReturn'});

      for (const child of statement.body) {
        this.emitStatement(scope, block, child);
      }

      this.emit(block, {kind: 'continue'});

      this.emit(target, {kind: 'enterBlock', block});
    } else if (statement.kind === 'if') {
      this.emitExpression(scope, target, statement.condition);

      const block = this.newBlock(ByteCodeBlockKind.If);

      for (const child of statement.body) {
        this.emitStatement(scope, block, child);
      }

      this.emit(block, {kind: 'exitBlock'});

      this.emit(target, {kind: 'branchEnter', block});
    } else if (statement.kind === 'expression') {
      this.emitExpression(scope, target, statement.expression);

      this.emit(target, {kind: 'pop'});
    } else if (statement.kind === 'return') {
      if (statement.value !== undefined) {
        this.emitExpression(scope, target, statement.value);
      } else {
        this.emit(target, {kind: 'pushUndefined'});
      }
      this.emit(target, {kind: 'return'});
    } else if (statement.kind === 'continue') {
      this.emit(target, {kind: 'continue'});
    } else if (statement.kind === 'break') {
      this.emit(target, {kind: 'break'});
    } else {
      throw new Error(`Unimplemented statement for emitStatement: {}`);
    }
  }

  private emitExpression(
    scope: GeneratorScope,
    target: BlockId,
    expression: Expression
  ) {
    if (expression.kind === 'boolean') {
      this.emit(target, {kind: 'pushBoolean', value: expression.value});
    } else if (expression.kind === 'string') {
      this.emit(target, {kind: 'pushString', value: expression.value});
    } else if (expression.kind === 'integer') {
      this.emit(target, {kind: 'pushInteger', value: expression.value});
    } else if (expression.kind === 'systemCall') {
      for (const arg of expression.args) {
        this.emitExpression(scope, target, arg);
      }

      this.emit(target, {
        kind: 'systemCall',
        type: expression.type,
        length: expression.args.length,
      });
    } else if (expression.kind === 'variable') {
      // TODO(joshua): I might need to resolve this variable into a register.

      this.emit(target, {kind: 'pushVariable', variable: expression.id});
    } else if (expression.kind === 'assignmentExpression') {
      this.emitExpression(scope, target, expression.value);
      this.emitExpression(scope, target, expression.target);

      if (expression.target.kind !== 'variable') {
        throw new Error('expression.target must be a Variable.');
      }

      this.emit(target, {kind: 'assignVariable'});
    } else if (expression.kind === 'binaryExpression') {
      this.emitExpression(scope, target, expression.lhs);
      this.emitExpression(scope, target, expression.rhs);

      this.emit(target, {kind: 'binaryExpression', op: expression.op});
    } else if (expression.kind === 'callExpression') {
      for (const arg of expression.args) {
        this.emitExpression(scope, target, arg);
      }

      this.emit(target, {kind: 'call', target: expression.target.name});
    } else if (expression.kind === 'arrayGetExpression') {
      this.emitExpression(scope, target, expression.target);
      this.emitExpression(scope, target, expression.index);

      this.emit(target, {kind: 'arrayGet'});
    } else if (expression.kind === 'arraySetExpression') {
      this.emitExpression(scope, target, expression.target);
      this.emitExpression(scope, target, expression.index);
      this.emitExpression(scope, target, expression.value);

      this.emit(target, {kind: 'arraySet'});
    } else {
      throw new Error(`Unimplemented expression for emitExpression: {}`);
    }
  }
}
