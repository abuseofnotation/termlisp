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

exports.parseFunctionDefinition = (env, definition) => {
  const fnIndex = definition.indexOf('=')
  const [signature, expression] = [definition.slice(0, fnIndex), definition.slice(fnIndex + 1) ]
  const [name, ...args] = signature
  return ({name, args, expression, env})
}


exports.print = (env, message, ...args) => console.log((env.stack.map(() => "-").join("")) + message , ...args)

