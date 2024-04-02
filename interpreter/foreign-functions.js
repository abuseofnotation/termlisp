const {formatExpression, equal} = require('./helpers')
debug = false
module.exports = {
  _print: (values, exec) => {
    console.log(formatExpression((values).map(exec)))
    if (debug) {
      //console.log(env.functions)
      for (line of env.stack) {
        console.log(" - "+ formatExpression(line))
      }
    }
    return values 
  },
  _eq: ([expressionOne, expressionTwo], exec) => {
    if (equal(exec(expressionOne), exec(expressionTwo))) {
      return ["Bool", "True"]
    } else {
      return ["Bool", "False"]
    }
  },
}

