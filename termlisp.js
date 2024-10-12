const fs = require('node:fs');
const {formatExpression} = require('./interpreter/helpers')
const {execString, env } = require('./interpreter/interpreter')
const {typecheckString} = require('./typechecker/typechecker')
require('./tests')

const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const prompt = (query) => new Promise((resolve) => rl.question(query, resolve));

const execInteractive = (program) => {

  //let typingErrors = typecheckString(program, env())
  //console.log(typingErrors.env.types)

  let result = execString(program, env())
  const repl = (env) => {
    return prompt('> ')
    .then((line) => {
      env.history = []
      const result = execString(line, env)

      for (log of result.env.history) {
        console.log(log)
      }

      if (typeof formatExpression(result) === 'string') {
        console.log(formatExpression(result))
      }
      return result.env
    })
    .catch((err) => { console.log(err); return env})
    .then(repl)}
  return repl(result.env)
}

try {
  const prelude = fs.readFileSync(__dirname + "/prelude.tls", 'utf8');
  //const prelude = ''
  const data = process.argv[2] ? fs.readFileSync( process.argv[2], 'utf8') : ''
  execInteractive(prelude+data)
} catch (err) {
  console.error(err);
}
