const splitBrackets = (expr) => {
  const result = []
  let currentExpression = ''
  let expressionStack = [result]
  const currentLevel = () => expressionStack[expressionStack.length - 1]

  const flush = () => {
    if (currentExpression !== '') {
      currentLevel().push(currentExpression)
      currentExpression = ''
    }
  }
  for (let char of expr) {
    if (char === "(") {
      flush()
      const newLevel = []
      currentLevel().push(newLevel)
      expressionStack.push(newLevel)
    } else if (char === ")") {
      flush()
      expressionStack.pop()
    } else if (char === " ") {
      flush()
    } else {
      currentExpression = currentExpression + char
    }
  }
  flush()
  return result
}
//console.log(splitBrackets('a (a + b) b'), ["a", ["a", "+", "b"], "b"])
//console.log(splitBrackets('(a (a + b)) b'), [["a",["a", "+", "b"]], "b"])
//console.log(splitBrackets('aa bb (cc)'), ["aa","bb", ["cc"]])


exports.parse = (program) => splitBrackets("(" + program.replace(/\r?\n|\r/g, ')(')+ ")")


