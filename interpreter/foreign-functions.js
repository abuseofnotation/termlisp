const {formatExpression, equal} = require('./helpers')
debug = false
module.exports = {
  print: (value, env) => {
    // only needed in lazy evaluation
    //value = exec(env, value)[1]

    console.log(formatExpression(value))
    if (debug) {
      //console.log(env.functions)
      for (line of env.stack) {
        console.log(" - "+ formatExpression(line))
      }
    }
    return []
  },
  eq: ([expressionOne, expressionTwo], env) => {
    if (equal(expressionOne, expressionTwo)) {
      return ["bool", "True"]
    } else {
      return ["bool", "False"]
    }
  },
}

