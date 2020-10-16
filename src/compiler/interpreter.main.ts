import {promises} from 'fs';
import {registerEntryPoint} from '../common';
import {Interpreter} from './interpreter';
import {Parser} from './parser';
import {Program} from './program';

registerEntryPoint('compiler:interpreter', async args => {
  const [fileName] = args;

  if (fileName === undefined) {
    throw new Error('Please specify a source file');
  }

  const sourceFileContent = await promises.readFile(fileName, 'utf8');

  const parser = new Parser();

  const ast = parser.parseString(sourceFileContent);

  const program = new Program();

  program.parseTree(ast);

  const interpreter = new Interpreter(program);

  interpreter.run();

  return 0;
});
