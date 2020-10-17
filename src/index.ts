require('source-map-support').install();

import {getEntryPoint} from './common';
import {getLogger} from './logger';

import './compiler/program.main';
import './compiler/interpreter.main';
import './tictactoe';

const log = getLogger('index');

async function main(args: string[]): Promise<number> {
  const [entryPointName, ...rest] = args;

  const entryPoint = getEntryPoint(entryPointName);

  if (entryPoint === undefined) {
    throw new Error('EntryPoint not found');
  }

  return entryPoint(rest);
}

if (require.main === module) {
  main(process.argv.slice(2))
    .then(exitCode => (process.exitCode = exitCode))
    .catch(err => {
      console.error('Fatal', err);
      process.exit(1);
    });
}
