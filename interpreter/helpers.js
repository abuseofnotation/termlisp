exports.formatExpression = (expression) => {
  if (Array.isArray(expression)) {
    return '(' + expression.map(exports.formatExpression).join(' ') + ')'
  } else {
    return expression
  }
}
exports.equal = (expressionOne, expressionTwo) => 
exports.formatExpression(expressionOne) === exports.formatExpression(expressionTwo)
