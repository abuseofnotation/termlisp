const compose = (f, g) => (...args) => f(g(...args))

exports.addBrackets = (a) => a.map((arg) => typeof arg === 'string' ? [arg] : arg)

exports.error = (error, env, object) => {
  const trace = env.stack.map((line) => "   at "+ formatExpression(line) + "\n")
  throw `Error: ${error} \n ${trace}`
  return (['error', error, env, object])
}


exports.removeExtraBrackets = (expression) => Array.isArray(expression) && expression.length === 1 ? expression[0] : expression

const formatExpression = compose((expression) => {
  if (Array.isArray(expression)) {
    return '(' + expression.map(exports.formatExpression).join(' ') + ')'
  } else {
    return expression
  }
}, exports.removeExtraBrackets)

exports.equal = (expressionOne, expressionTwo) => 
  exports.formatExpression(expressionOne) === exports.formatExpression(expressionTwo)


exports.print = (env, message, ...args) => console.log((env.stack.map(() => "  ").join("")) + message.padEnd(30) , ...args)

exports.formatExpression = formatExpression
