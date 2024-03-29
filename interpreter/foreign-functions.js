const {formatExpression, equal} = require('./helpers')
module.exports = {
  print: (value, env) => {
  /*
  for (line of env.stack) {
    console.log("   "+ formatExpression(line))
  }
  */
    // only needed in lazy evaluation
    //value = exec(env, value)[1]
    console.log(formatExpression(value))
  },
  "#": () => undefined,
  eq: ([expressionOne, expressionTwo], env) => {
    if (equal(expressionOne, expressionTwo)) {
      return ["bool", "True"]
    } else {
      return ["bool", "False"]
    }
  },
  env: (value, env) => console.log(env)
}

