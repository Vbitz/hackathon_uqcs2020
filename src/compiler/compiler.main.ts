import {promises} from 'fs';
import {registerEntryPoint} from '../common';
import {getLogger} from '../logger';
import {Compiler} from './compiler';
import {Parser} from './parser';

const log = getLogger('compiler:main');

registerEntryPoint('compiler', async args => {
  const [fileName] = args;

  log.log('Compiling', fileName);

  if (fileName === undefined) {
    throw new Error('Please specify a source file');
  }

  const sourceFileContent = await promises.readFile(fileName, 'utf8');

  const parser = new Parser();

  const ast = parser.parseString(sourceFileContent);

  const compiler = new Compiler();

  compiler.parseTree(ast);

  const result = compiler.emit();

  return 0;
});
