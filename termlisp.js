const fs = require('node:fs');
const {execString } = require('./interpreter/interpreter')

const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const prompt = (query) => new Promise((resolve) => rl.question(query, resolve));

const execInteractive = (program) => {
  let [env, result] = execString(program, { stack: [], functions: {}, types: {}})
  const repl = () => prompt('> ')
    .then((line) => { [env, result ] = execString('(print (' + line + '))', env)}).catch((err) => console.log(err))
    .then(repl)
  repl()

}

try {
  const data = fs.readFileSync( process.argv[2], 'utf8');
  execInteractive(data)
} catch (err) {
  console.error(err);
}
