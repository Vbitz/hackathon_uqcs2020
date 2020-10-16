import {promises} from 'fs';
import {registerEntryPoint} from '../common';
import {getLogger} from '../logger';
import {Program} from './program';
import {Parser} from './parser';

const log = getLogger('compiler:main');

registerEntryPoint('compiler:program', async args => {
  const [fileName] = args;

  log.log('Compiling', fileName);

  if (fileName === undefined) {
    throw new Error('Please specify a source file');
  }

  const sourceFileContent = await promises.readFile(fileName, 'utf8');

  const parser = new Parser();

  const ast = parser.parseString(sourceFileContent);

  const program = new Program();

  program.parseTree(ast);

  return 0;
});
