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

  constructor(readonly block: ByteCodeBlock, readonly id: number) {}
}

async function readChar(): Promise<string> {
  process.stdin.setRawMode(true);
  return new Promise(resolve =>
    process.stdin.once('data', chunk => {
      process.stdin.setRawMode(false);
      resolve(chunk.toString('utf8')[0]);
    })
  );
}

export class Interpreter {
  private blockStack: BlockFrame[] = [];
  private valueStack: value.Value[] = [];

  private topLevelVariables = new Map<number, value.Value>();

  constructor(readonly byteCode: ByteCode) {}

  async run(): Promise<number> {
    for (const topLevelVariable of this.byteCode.topLevelVariables) {
      this.topLevelVariables.set(topLevelVariable, value.undefined);
    }

    await this.runInstruction({kind: 'call', target: 'main'});

    return this.runLoop();
  }

  private async runLoop(): Promise<number> {
    while (true) {
      const currentBlock = this.blockStack[this.blockStack.length - 1];

      if (currentBlock === undefined) {
        return 0;
      }

      const currentInstruction =
        currentBlock.block.instructions[currentBlock.instructionPointer];

      if (currentInstruction === undefined) {
        throw new Error('Invalid Instruction Pointer');
      }

      try {
        if (!(await this.runInstruction(currentInstruction))) {
          return 1;
        }
      } catch (ex) {
        log.log('Error running instruction', ex);
        log.log(
          'Current Block is a ' + ByteCodeBlockKind[currentBlock.block.kind]
        );
        log.log('BlockId =', currentBlock.id);
        log.log('IP =', currentBlock.instructionPointer);
        return 1;
      }

      currentBlock.instructionPointer += 1;
    }
  }

  private async runInstruction(instr: ByteCodeInstruction): Promise<boolean> {
    if (instr.kind === 'call') {
      const functionInfo = this.getFunction(instr.target);
      const functionBlock = this.getBlock(functionInfo.entryBlock);

      const functionFrame = new BlockFrame(
        functionBlock,
        functionInfo.entryBlock
      );

      for (const variable of functionInfo.variables) {
        functionFrame.variables.set(variable, value.undefined);
      }

      this.blockStack.push(functionFrame);
    } else if (instr.kind === 'systemCall') {
      if (instr.type === SystemCallKind.DebugWrite) {
        for (let i = 0; i < instr.length; i++) {
          const arg = this.resolveValue(this.pop());

          process.stdout.write(value.toString(arg));
        }

        this.push(value.undefined);
      } else {
        const chr = await readChar();

        if (chr.charCodeAt(0) == 3) {
          return false;
        }

        this.push(value.fromString(chr));
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
      const newValue = this.resolveValue(this.pop());
      const index = this.resolveValue(this.pop());
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

      const indexNum = value.toNumber(index);

      // log.log('set', target, indexNum, newValue);

      arrayValue.values[indexNum] = newValue;

      this.push(value.undefined);
    } else if (instr.kind === 'arrayGet') {
      const index = this.resolveValue(this.pop());
      const target = this.pop();

      if (target.kind !== 'variable') {
        throw new Error('arrayGet target is not a variable');
      }

      let arrayValue = this.getVariable(target.target);

      if (arrayValue.kind !== 'array') {
        this.setVariable(target.target, value.newArray());

        arrayValue = this.getVariable(target.target);

        if (arrayValue.kind !== 'array') {
          throw new Error('Not Implemented');
        }
      }

      const indexNum = value.toNumber(index);

      // log.log('get', target, indexNum);

      const result = arrayValue.values[indexNum];

      if (result === undefined) {
        this.push(value.undefined);
      } else {
        this.push(result);
      }
    } else if (instr.kind === 'assignVariable') {
      const target = this.pop();
      const newValue = this.resolveValue(this.pop());

      if (target.kind !== 'variable') {
        throw new Error('assignVariable target is not a variable');
      }

      // log.log('assign to', target.target, newValue);

      this.setVariable(target.target, newValue);

      this.push(newValue);
    } else if (instr.kind === 'assignVariableDirect') {
      const newValue = this.resolveValue(this.pop());

      // log.log('assign direct', instr.target, newValue);

      this.setVariable(instr.target, newValue);
    } else if (instr.kind === 'return') {
      // The return value could be a reference local to the current function.
      // The solution is to pop the last value from the stack and resolve it.
      // Functions always have a return value.
      const returnValue = this.pop();
      this.push(this.resolveValue(returnValue));

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

      this.blockStack.push(new BlockFrame(block, instr.block));
    } else if (instr.kind === 'exitBlock') {
      this.blockStack.pop();
    } else if (instr.kind === 'branchEnter') {
      const test = this.pop();

      const testBool = value.toBoolean(test);

      if (testBool) {
        const block = this.getBlock(instr.block);

        this.blockStack.push(new BlockFrame(block, instr.block));
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
    } else if (instr.kind === 'continue') {
      let changedBlock = false;
      while (true) {
        const currentBlock = this.blockStack[this.blockStack.length - 1];

        if (currentBlock.block.kind === ByteCodeBlockKind.While) {
          if (changedBlock) {
            currentBlock.instructionPointer = 0;
          } else {
            currentBlock.instructionPointer = -1;
          }

          this.blockStack.push(currentBlock);

          // TODO(joshua): Is this correct?
          currentBlock.variables.clear();

          break;
        } else if (currentBlock.block.kind === ByteCodeBlockKind.If) {
          this.blockStack.pop();
          changedBlock = true;
        } else {
          throw new Error("Continue can't unroll from function calls.");
        }
      }
    } else if (instr.kind === 'break') {
      const currentBlock = this.blockStack[this.blockStack.length - 1];

      if (currentBlock.block.kind === ByteCodeBlockKind.While) {
        this.blockStack.pop();
      } else {
        throw new Error('Continue not implemented in nested blocks');
      }
    } else {
      throw new Error(`Instruction {} not implemented.`);
    }

    return true;
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

      // log.log(block.id, block.variables);

      if (block.variables.has(id)) {
        return block.variables.get(id) || expect('Unreachable');
      }
    }

    if (this.topLevelVariables.has(id)) {
      return this.topLevelVariables.get(id) || expect('Unreachable');
    }

    throw new Error('Could not find variable: ' + id);
  }

  private runOperation(
    op: OperatorKind,
    lhs: value.Value,
    rhs: value.Value
  ): value.Value {
    // log.log('runOperation', lhs, rhs);

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
    } else if (op === OperatorKind.NotEquals) {
      const lhsValue = this.resolveValue(lhs);
      const rhsValue = this.resolveValue(rhs);

      if (lhsValue.kind === 'string' && rhsValue.kind === 'string') {
        return value.fromBoolean(
          value.toString(lhsValue) !== value.toString(rhsValue)
        );
      } else {
        return value.fromBoolean(
          value.toBoolean(lhsValue) !== value.toBoolean(rhsValue)
        );
      }
    } else {
      throw new Error(`runOperation not implemented for ${op}`);
    }
  }

  private resolveValue(val: value.Value): value.Value {
    if (val.kind === 'variable') {
      return this.resolveValue(this.getVariable(val.target));
    } else {
      return val;
    }
  }
}
