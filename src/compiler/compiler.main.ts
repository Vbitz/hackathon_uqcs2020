import {promises} from 'fs';
import {registerEntryPoint} from '../common';
import {getLogger} from '../logger';
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

  log.log(JSON.stringify(ast, undefined, '  '));

  return 0;
});
