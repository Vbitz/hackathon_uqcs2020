import {threadId} from 'worker_threads';
import {expect} from '../common';
import {getLogger} from '../logger';
import {
  BlockId,
  ByteCode,
  ByteCodeBlock,
  ByteCodeBlockKind,
  ByteCodeFunction,
  ByteCodeInstruction,
} from './codeGen.byteCode';
import {OperatorKind} from './parser';
import {SystemCallKind} from './program';
import * as value from './value';

const log = getLogger('compiler:interpreter');

export class BlockFrame {
  instructionPointer = 0;

  variables = new Map<number, value.Value>();

  constructor(readonly block: ByteCodeBlock) {}
}

export class Interpreter {
  private blockStack: BlockFrame[] = [];
  private valueStack: value.Value[] = [];

  private topLevelVariables = new Map<number, value.Value>();

  constructor(readonly byteCode: ByteCode) {}

  async run() {
    for (const topLevelVariable of this.byteCode.topLevelVariables) {
      this.topLevelVariables.set(topLevelVariable, value.undefined);
    }

    await this.runInstruction({kind: 'call', target: 'main'});

    await this.runLoop();
  }

  private async runLoop() {
    while (true) {
      const currentBlock = this.blockStack[this.blockStack.length - 1];

      if (currentBlock === undefined) {
        break;
      }

      const currentInstruction =
        currentBlock.block.instructions[currentBlock.instructionPointer];

      await this.runInstruction(currentInstruction);

      currentBlock.instructionPointer += 1;
    }
  }

  private async runInstruction(instr: ByteCodeInstruction) {
    if (instr.kind === 'call') {
      const functionInfo = this.getFunction(instr.target);
      const functionBlock = this.getBlock(functionInfo.entryBlock);

      const functionFrame = new BlockFrame(functionBlock);

      for (const variable of functionInfo.variables) {
        functionFrame.variables.set(variable, value.undefined);
      }

      this.blockStack.push(functionFrame);
    } else if (instr.kind === 'systemCall') {
      if (instr.type === SystemCallKind.DebugWrite) {
        for (let i = 0; i < instr.length; i++) {
          const arg = this.pop();

          process.stdout.write(value.toString(arg));
        }

        this.push(value.undefined);
      } else {
        throw new Error(`SystemCall ${instr.type} not implemented`);
      }
    } else if (instr.kind === 'pushVariable') {
      this.push(value.fromVariable(instr.variable));
    } else if (instr.kind === 'pushInteger') {
      this.push(value.fromNumber(instr.value));
    } else if (instr.kind === 'pushString') {
      this.push(value.fromString(instr.value));
    } else if (instr.kind === 'pushBoolean') {
      this.push(value.fromBoolean(instr.value));
    } else if (instr.kind === 'pushUndefined') {
      this.push(value.undefined);
    } else if (instr.kind === 'pop') {
      this.pop();
    } else if (instr.kind === 'arraySet') {
      const newValue = this.pop();
      const index = this.pop();
      const target = this.pop();

      if (target.kind !== 'variable') {
        throw new Error('arraySet target is not a variable');
      }

      let arrayValue = this.getVariable(target.target);

      if (arrayValue.kind !== 'array') {
        this.setVariable(target.target, value.newArray());

        arrayValue = this.getVariable(target.target);

        if (arrayValue.kind !== 'array') {
          throw new Error('Not Implemented');
        }
      }

      arrayValue.values[value.toNumber(index)] = newValue;

      this.push(value.undefined);
    } else if (instr.kind === 'arrayGet') {
      const index = this.pop();
      const target = this.pop();

      if (target.kind !== 'variable') {
        throw new Error('arraySet target is not a variable');
      }

      let arrayValue = this.getVariable(target.target);

      if (arrayValue.kind !== 'array') {
        this.setVariable(target.target, value.newArray());

        arrayValue = this.getVariable(target.target);

        if (arrayValue.kind !== 'array') {
          throw new Error('Not Implemented');
        }
      }

      const result = arrayValue.values[value.toNumber(index)];

      if (result === undefined) {
        this.push(value.undefined);
      } else {
        this.push(result);
      }
    } else if (instr.kind === 'assignVariable') {
      const newValue = this.pop();
      const target = this.pop();

      if (target.kind !== 'variable') {
        throw new Error('arraySet target is not a variable');
      }

      this.setVariable(target.target, newValue);

      this.push(newValue);
    } else if (instr.kind === 'assignVariableDirect') {
      const newValue = this.pop();

      this.setVariable(instr.target, newValue);

      this.push(newValue);
    } else if (instr.kind === 'return') {
      // Unroll the stack until we reach a function.
      while (true) {
        const currentBlock = this.blockStack.pop();

        if (currentBlock === undefined) {
          throw new Error('Not Implemented');
        }

        if (currentBlock.block.kind === ByteCodeBlockKind.Function) {
          break;
        }
      }
    } else if (instr.kind === 'enterBlock') {
      const block = this.getBlock(instr.block);

      this.blockStack.push(new BlockFrame(block));
    } else if (instr.kind === 'branchEnter') {
      const test = this.pop();

      const testBool = value.toBoolean(test);

      if (testBool) {
        const block = this.getBlock(instr.block);

        this.blockStack.push(new BlockFrame(block));
      }
    } else if (instr.kind === 'branchReturn') {
      const test = this.pop();

      const testBool = value.toBoolean(test);

      if (!testBool) {
        this.blockStack.pop();
      }
    } else if (instr.kind === 'binaryExpression') {
      const rhs = this.pop();
      const lhs = this.pop();

      const result = this.runOperation(instr.op, lhs, rhs);

      this.push(result);
    } else {
      throw new Error(`Instruction ${instr.kind} not implemented.`);
    }
  }

  private push(val: value.Value) {
    this.valueStack.push(val);
  }

  private pop(): value.Value {
    const val = this.valueStack.pop();

    if (val === undefined) {
      throw new Error('Stack underflow');
    }

    return val;
  }

  private getBlock(id: BlockId): ByteCodeBlock {
    const block = this.byteCode.blocks[id];

    if (block === undefined) {
      throw new Error('Block not found.');
    }

    return block;
  }

  private getFunction(target: string): ByteCodeFunction {
    const func = this.byteCode.functions[target];

    if (func === undefined) {
      throw new Error('Function not found.');
    }

    return func;
  }

  private setVariable(id: number, value: value.Value) {
    for (let i = this.blockStack.length; i > 0; i--) {
      const block = this.blockStack[i - 1];

      if (block.variables.has(id)) {
        block.variables.set(id, value);
      }
    }

    if (this.topLevelVariables.has(id)) {
      this.topLevelVariables.set(id, value);
    }

    this.blockStack[this.blockStack.length - 1].variables.set(id, value);
  }

  private getVariable(id: number): value.Value {
    for (let i = this.blockStack.length; i > 0; i--) {
      const block = this.blockStack[i - 1];

      if (block.variables.has(id)) {
        return block.variables.get(id) || expect('Unreachable');
      }
    }

    if (this.topLevelVariables.has(id)) {
      return this.topLevelVariables.get(id) || expect('Unreachable');
    }

    return value.undefined;
  }

  private runOperation(
    op: OperatorKind,
    lhs: value.Value,
    rhs: value.Value
  ): value.Value {
    if (op === OperatorKind.Equals) {
      const lhsValue = this.resolveValue(lhs);
      const rhsValue = this.resolveValue(rhs);

      if (lhsValue.kind === 'string' && rhsValue.kind === 'string') {
        return value.fromBoolean(
          value.toString(lhsValue) === value.toString(rhsValue)
        );
      } else {
        return value.fromBoolean(
          value.toBoolean(lhsValue) === value.toBoolean(rhsValue)
        );
      }
    } else {
      throw new Error(`runOperation not implemented for ${op}`);
    }
  }

  private resolveValue(val: value.Value): value.Value {
    if (val.kind === 'variable') {
      return this.getVariable(val.target);
    } else {
      return val;
    }
  }
}
