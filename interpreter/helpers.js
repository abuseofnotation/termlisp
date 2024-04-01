exports.formatExpression = (expression) => {

  const expressionNoExtraBrackets = Array.isArray(expression) && expression.length === 1 ? expression[0] : expression
  if (Array.isArray(expressionNoExtraBrackets)) {
    return '(' + expressionNoExtraBrackets.map(exports.formatExpression).join(' ') + ')'
  } else {
    return expressionNoExtraBrackets
  }
}
exports.equal = (expressionOne, expressionTwo) => 
exports.formatExpression(expressionOne) === exports.formatExpression(expressionTwo)
