import {registerEntryPoint} from '../common';

registerEntryPoint('compiler', async args => {
  console.log('Hello, World');

  return 0;
});
