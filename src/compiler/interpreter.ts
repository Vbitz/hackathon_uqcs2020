import {getLogger} from '../logger';
import {OperatorKind} from './parser';
import {
  Expression,
  FunctionDeclaration,
  Program,
  SystemCallKind,
} from './program';

const log = getLogger('compiler:interpreter');

interface FunctionCall {
  target: FunctionDeclaration;
}

function createCall(target: FunctionDeclaration): FunctionCall {
  return {target};
}

export class Interpreter {
  private stack: FunctionCall[] = [];
  constructor(readonly program: Program) {}

  run() {
    const mainFunction = this.program.getFunctionByName('main');

    this.stack.unshift(createCall(mainFunction));

    while (true) {
      if (!this.step()) {
        break;
      }
    }
  }

  private step(): boolean {
    const nextFrame = this.stack.shift();

    if (nextFrame === undefined) {
      return false;
    }

    this.runFrame(nextFrame);

    return true;
  }

  private runFrame(frame: FunctionCall) {
    const {target} = frame;

    for (const statement of target.statements) {
      if (statement.kind === 'systemCall') {
        this.runSystemCall(statement.type, statement.args);
      } else {
        throw new Error(`Statement ${statement.kind} not implemented.`);
      }
    }
  }

  private runSystemCall(type: SystemCallKind, args: Expression[]) {
    if (type === SystemCallKind.DebugPrint) {
      const value = this.executeExpression(args[0]);

      log.log('DebugPrint', value);
    } else {
      throw new Error('System Call not found.');
    }
  }

  private executeExpression(expr: Expression): string {
    if (expr.kind === 'string') {
      return expr.value;
    } else if (expr.kind === 'integer') {
      return expr.value.toString(10);
    } else if (expr.kind === 'binaryExpression') {
      const lhsValue = this.executeExpression(expr.lhs);
      const rhsValue = this.executeExpression(expr.rhs);

      const lhsNumber = parseInt(lhsValue, 10);
      const rhsNumber = parseInt(rhsValue, 10);

      if (expr.op === OperatorKind.Plus) {
        return (lhsNumber + rhsNumber).toString(10);
      } else if (expr.op === OperatorKind.Minus) {
        return (lhsNumber - rhsNumber).toString(10);
      } else if (expr.op === OperatorKind.Multiply) {
        return (lhsNumber * rhsNumber).toString(10);
      } else if (expr.op === OperatorKind.Divide) {
        return (lhsNumber / rhsNumber).toString(10);
      } else {
        throw new Error('Unknown Operator');
      }
    } else {
      throw new Error(`executeExpression not implemented for {}.`);
    }
  }
}
