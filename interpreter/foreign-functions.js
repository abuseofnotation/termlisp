const {formatExpression, equal} = require('./helpers')
debug = false
module.exports = {
  _print: (values, exec) => {
    console.log(formatExpression((values).map(exec)))
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

