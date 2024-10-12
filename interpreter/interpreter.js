const {name, parse } = require('./parser')
const {formatExpression, error} = require('./helpers')
const {parseFunctionDefinition} = require('./types')
const {patternMatchArgumentsByNames} = require('./pattern-match')
const foreignFunctions = require('./foreign-functions')

const env = () => ({ history: [], stack: [], functions: {}, types: {}})


const print = (env, message, arg) => { 
  const log = env.stack.map(() => "  ").join("") + message.padEnd(30) + arg
  //console.log(log)
  env.history.push(log)
}

const addBrackets = (a) => a.map((arg) => typeof arg === 'string' ? [arg] : arg)

const cloneEnv = (env, argumentFunctions, stack) => ({
    stack,
    functions: { ...env.functions, ...argumentFunctions },
    types: env.types,
    history: env.history,
})

const execDataConstructor = (env, name, args) => {
  const newEnv = () => cloneEnv(env, {}, env.stack.slice())
  const expression = args.length > 0 ? [name, ...args.map((arg) => exec(newEnv(), arg))] : [name]
  expression.env = env
  return expression
}

const formatEnv = (obj) => Object.keys(obj)
  .map((key) => key + " : " +  formatExpression(obj[key][0].expression))
  .join(', ')

const execFunctionApplicationExpression = (env, func, functionArguments) => {
      const expression = typeof func.expression === 'string' ? [func.expression] : func.expression
      const argumentEnv = cloneEnv(func.env, functionArguments, env.stack.slice())
      // print(env, "Substituting variables :", formatExpression([func.expression]))
        print(env, "With local env :", formatEnv(functionArguments))
      //print(env, "With global environment:", func.env.functions)

      const result = exec(argumentEnv, expression)
      print(env, "Returning result  :", formatExpression(result))

      // We return the old environment in order not to pollute the global scope
      // with the vals that are local to the function
      result.env = env
      return result
}

const execFunctionApplication = (env, name, args) => {
  const implementations = env.functions[name]
  if (implementations !== undefined) {
    env.stack.unshift([name, args])
    const patternMatches = implementations.map((func) => 
      patternMatchArgumentsByNames(addBrackets(func.args), func.env, args, env,  exec)
    )
    const patternMatchIndex = patternMatches.findIndex(({type}) => type !== 'error')
    if (patternMatchIndex !== -1) {
      const func = implementations[patternMatchIndex]
      print(env, "Executing implementation: ", formatExpression([name, func.args, '=', func.expression]))
      const functionArguments = patternMatches[patternMatchIndex]
      return execFunctionApplicationExpression(env, func, functionArguments)
    } else {
      const errors = patternMatches.map(({error, }, i) =>
    `${formatExpression(implementations[i].args)} - ${error}\n`)

      return error(`Failed to call function '${name}' with arguments ${formatExpression(args)}\n ${errors}`, env)
    }
  } else {
      return error(`Failed to call function '${name}' with arguments ${formatExpression(args)}\n No such function is defined`, env)
  }
}

const execForeignFunctionApplication = (env, name, args) => {
  if (foreignFunctions[name] !== undefined) {
    //check if val is a foreign function
    // if it is a function, execute it.
    print(env, "Executing a foreign function ",  formatExpression([name, ...args]))
    const result = foreignFunctions[name](args, (val) => exec(env, val))
    print(env, "Returning from foreign function: ", formatExpression(result))
    result.env = env
    return result
  } else {
      return error(`Failed to call foreign function '${name}' with arguments ${formatExpression(args.map(exec))}\n No such function is defined`, env)
  }
}

const execTypeDeclaration = (env, args) => {
  const [name, ...functions] = args
  const moduleEnv = exec(cloneEnv(env, {}, env.stack.slice()) , functions).env
  //TODO very sloppy, module environments should have their own scope.
  for (fnName of Object.keys(moduleEnv.functions)) {
    env.functions[`${name}.${fnName}`] = moduleEnv.functions[fnName]
  }
  env.functions[name] = []
  result = []
  result.env = env
  return result
}

const execFunctionApplicationOrDataConstructor = (env, name, argsUnexecuted) => {
    //print(env, "Encountered a name ", formatExpression([name, ...argsUnexecuted]))

    const makeThunk = (arg) => {
      const argument = typeof arg == 'string' ? [arg] : arg
      argument.env = env; 
      return argument
    }
    if (name === ":type") {
      return execTypeDeclaration(env, argsUnexecuted)
    } else {
      const args = argsUnexecuted.map(makeThunk)
      const fun = env.functions[name]
      if (fun !== undefined) {

        //if (fun.length === 0 && fun[0].args.length === 0) 
        // print(env, "Looking up variable: ", formatExpression([name]))

        print(env, "Executing function call: ", formatExpression([name, ...args]))
        return execFunctionApplication(env, name, args)
      } else if (foreignFunctions[name] !== undefined) {
        print(env, "Executing a foreign function call:", formatExpression([name, ...args]))
        return execForeignFunctionApplication(env, name, args)
      } else {
        print(env, "New a data constructor ", formatExpression([name, ...args]))
        return execDataConstructor(env, name, args)
      }
    }
}



const exec = (env, expression) => {
  if (!Array.isArray(expression)) {
    throw new Error('Invalid expression: ' + typeof expression + " " + formatExpression(expression))
  } else if (typeof env !== 'object') {
    console.log('Error at evaluating ', expression, ".")
    throw new Error(`${env} is not an object`)
  } else if (env.stack.length > 100) {
    return error("Stack Overflow", env)

  } else if (env.functions === undefined) {
    throw new Error(`Faulty environment object: ${JSON.stringify(env)}`)
  } else if (expression.filter((a) => (a === "=")).length > 1) { 
    throw new Error(`Expression ${formatExpression(expression)} has more than one "=" symbol, did you forget to put it into parenthesis?`)
  } else {
    print(env, "Executing expression: ", formatExpression(expression))
    const fnIndex = expression.indexOf('=')

    if (fnIndex !== -1 ) {
      //Executing function definition
      return execFunctionDefinition(env, expression)

    //TODO functions are not always literals, account for that
    } else if (typeof expression[0] === 'string') {
      //Each expression is a name, and arguments
      const [name, ...args] = expression
      return execFunctionApplicationOrDataConstructor(env, name, args)
    } else {
      //print(env, "Executing an expression chain")
      //Exec a bunch of statements
      let localExpression = []
      localExpression.env = env
      for (let anExpression of expression) {
        const localEnv = {...localExpression.env, stack: env.stack.slice()}
        let newExpression = exec(localEnv, anExpression)
        //print(env, "Executing an expression from chain: ")
        //if (debug) console.log("Updated environment", Object.keys(newExpression.env.functions).join(', '))
        localExpression = newExpression
      }
      return localExpression
    }
  }
}

const sameSignature = (fun1) => (fun2) => {
  if (fun1.length === fun2.length) {
    let same = true
    for (let i = 0; i <fun1.length; i++){
      if (typeof fun1[i] !== 'string' || typeof fun2[i] !== 'string') {
        same = false
      }
    }
    return same
  } else {
    return false
  }
}

const repeatingSignature = (fun, funs) =>
  funs
    .map((a) => a.args)
    .find(sameSignature(fun.args)) 

const execFunctionDefinition = (env, definition) => {
  const fun = parseFunctionDefinition(env, definition)
  const name = definition[0]
  if (env.functions[name] === undefined) {
    //debug && console.log(`New function: ${name}`)
    env.functions[name] = [fun]
    env.functions[name].env = env
    return env.functions[name]
  } else {
    const sig = repeatingSignature(fun, env.functions[name])
    if (sig === undefined ) {
      //debug && console.log(`Registering a new implementation of ${name}`)
      env.functions[name].push(fun)
      env.functions[name].env = env
      return env.functions[name]
    } else {
      return error(`Repeating signature: ${formatExpression(fun.args)} is the same as ${formatExpression(sig)} in function ${name}.` , env)
    }
  }
}

const execString = (string, env ) => {
  expression = parse(string)
  const result = exec(env, expression)
  return result
}

module.exports = { execString, env}
