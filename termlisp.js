const fs = require('node:fs');
const {execString } = require('./interpreter/interpreter')

const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const prompt = (query) => new Promise((resolve) => rl.question(query, resolve));

const execInteractive = (program) => {
  let env = execString(program, { stack: [], functions: {}, types: {}})
  const repl = (env) => prompt('> ')
    .then((line) => execString('(print (' + line + '))', env))
    .catch((err) => { console.log(err); return env})
    .then(repl)
  repl(env)

}

try {
  const prelude = fs.readFileSync(__dirname + "/prelude.tls", 'utf8');
  const data = process.argv[2] ? fs.readFileSync( process.argv[2], 'utf8') : ''
  execInteractive(prelude+data)
} catch (err) {
  console.error(err);
}
