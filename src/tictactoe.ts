import {readSync} from 'fs';
import {registerEntryPoint} from './common';
import {getLogger} from './logger';

const log = getLogger('tictactoe');

type State = 'X' | 'O' | ' ';

let boardState: State[] = [];
let currentTurn: State = ' ';

async function keypress(): Promise<string> {
  process.stdin.setRawMode(true);
  return new Promise(resolve =>
    process.stdin.once('data', chunk => {
      process.stdin.setRawMode(false);
      resolve(chunk.toString('utf8')[0]);
    })
  );
}

async function getInput(text: string) {
  while (true) {
    process.stdout.write(text);

    const input = await keypress();

    process.stdout.write(input + '\n');

    if (input.charCodeAt(0) == 3) {
      process.exit(0);
    }

    if (input === '0') {
      return 0;
    } else if (input === '1') {
      return 1;
    } else if (input === '2') {
      return 2;
    } else if (input === '3') {
      return 3;
    } else if (input === '4') {
      return 4;
    } else if (input === '5') {
      return 5;
    } else if (input === '6') {
      return 6;
    } else if (input === '7') {
      return 7;
    } else if (input === '8') {
      return 8;
    }

    process.stdout.write('Not recognized\n');
  }
}

async function doTurn(current: State) {
  while (true) {
    if (current === 'X') {
      process.stdout.write("It's X's turn\n");
    } else if (current === 'O') {
      process.stdout.write("It's O's turn\n");
    }
    const input = await getInput('enter new location: ');

    if (boardState[input] !== ' ') {
      process.stdout.write('that space is already taken\n');
      continue;
    }

    boardState[input] = current;

    break;
  }
}

function checkWinSingle(a: number, b: number, c: number): State {
  if (
    boardState[a] === boardState[b] &&
    boardState[b] === boardState[c] &&
    boardState[a] !== ' '
  ) {
    return boardState[a];
  }

  return ' ';
}

function checkWin(): State {
  let result: State = ' ';

  result = checkWinSingle(0, 1, 2);

  if (result !== ' ') return result;

  result = checkWinSingle(3, 4, 5);

  if (result !== ' ') return result;

  result = checkWinSingle(6, 7, 8);

  if (result !== ' ') return result;

  result = checkWinSingle(0, 3, 6);

  if (result !== ' ') return result;

  result = checkWinSingle(1, 4, 7);

  if (result !== ' ') return result;

  result = checkWinSingle(2, 5, 8);

  if (result !== ' ') return result;

  result = checkWinSingle(0, 4, 8);

  if (result !== ' ') return result;

  result = checkWinSingle(2, 4, 6);

  if (result !== ' ') return result;

  return ' ';
}

async function main() {
  reset();

  while (true) {
    printBoard();

    if (currentTurn === 'X') {
      await doTurn(currentTurn);

      currentTurn = 'O';
    } else if (currentTurn === 'O') {
      await doTurn(currentTurn);

      currentTurn = 'X';
    }

    const isWin = checkWin();

    if (isWin !== ' ') {
      printBoard();

      process.stdout.write(isWin + ' Wins\n\n');

      process.exit(0);
    }
  }
}

function printBoard() {
  process.stdout.write(
    boardState[0] + ' | ' + boardState[1] + ' | ' + boardState[2] + '\n'
  );
  process.stdout.write('\n');
  process.stdout.write(
    boardState[3] + ' | ' + boardState[4] + ' | ' + boardState[5] + '\n'
  );
  process.stdout.write('\n');
  process.stdout.write(
    boardState[6] + ' | ' + boardState[7] + ' | ' + boardState[8] + '\n'
  );
  process.stdout.write('\n');
}

function reset() {
  boardState = [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '];

  currentTurn = 'X';
}

registerEntryPoint('tictactoe', async args => {
  main();

  return 0;
});
