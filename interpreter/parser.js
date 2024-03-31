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
      if (currentLevel()=== undefined) {
        throw "Unmatched closing bracket"
      }
    } else if (char === " ") {
      flush()
    } else {
      currentExpression = currentExpression + char
    }
  }
  flush()
  if (expressionStack.length > 1) {
    throw (`Parsing error: there are ${expressionStack.length - 1 } missing closing brackets`)
  }
  return result
}
//console.log(splitBrackets('a (a + b) b'), ["a", ["a", "+", "b"], "b"])
//console.log(splitBrackets('(a (a + b)) b'), [["a",["a", "+", "b"]], "b"])
//console.log(splitBrackets('aa bb (cc)'), ["aa","bb", ["cc"]])
const removeComments = (program) => program.split(/\r?\n/)
  .map((line) => {
    if (line[0] === ';' && line[1] === ';'){
      return ''
    } else {
      return line
    }
  }).join('')

const print = (a) => {
  //console.log(a)
  return a
}

exports.parse = (program) => print(splitBrackets(removeComments(program)))
