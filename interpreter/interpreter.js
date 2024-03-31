const {name, parse } = require('./parser')
const {formatExpression} = require('./helpers')
const {patternMatchArgumentsByNames} = require('./pattern-match')
const foreignFunctions = require('./foreign-functions')

const debug = false

const print = (env, message, ...args) => console.log((env.stack.map(() => "-").join("")) + message , ...args)


const error = (error, env, object) => {
  const trace = env.stack.map((line) => "   at "+ formatExpression(line) + "\n")
  throw `Error: ${error} \n ${trace}`
  return (['error', error, env, object])
}


//TODO perhaps we can use the function that execs a bunch of statements sequentially
const execFunctionArguments = (env, argsUnexecuted) => {
  const makeEnv = () => ({...env, stack: env.stack.slice()})
  return argsUnexecuted.map((arg) => {
    const argument = typeof arg === 'string' ? [arg] : arg
    argument.env = makeEnv()
    return exec(argument)
  })
}

const cloneEnv = (env, argumentFunctions, stack) => ({
    stack,
    functions: { ...env.functions, ...argumentFunctions },
    types: env.types,
})

const execDataConstructor = (env, name, args) => {
  const expression = args.length > 0 ? [name, ...args] : name
  expression.env = env
  return expression
}

const execFunctionApplication = (env, name, args) => {
    const implementations = env.functions[name]
    const patternMatches = env.functions[name].map((func) => 
      patternMatchArgumentsByNames(execFunctionArguments(func.env, func.args), args, env)
    )
    const patternMatchIndex = patternMatches.findIndex(({type}) => type !== 'error')
    if (patternMatchIndex !== -1) {
      const func = implementations[patternMatchIndex]
      const functionArguments = patternMatches[patternMatchIndex]
      const expression = typeof func.expression === 'string' ? [func.expression] : func.expression
      expression.env = cloneEnv(func.env, functionArguments, env.stack.slice())


      debug && print(env, "Evaluating expression  :", formatExpression([func.expression]))
      if (args.length > 0) {
        debug && print(env, "with local environment :", functionArguments)
      }
      //debug && print(env, "with global environment:", func.env.functions)

      const result = exec(expression)
      debug && print( env, "Returning result  :", formatExpression(result))


      // We return the old environment in order not to pollute the global scope
      // with the vals that are local to the function
      result.env = env
      return result
    } else {
      const errors = patternMatches.map(({error, }, i) =>
    `${formatExpression(implementations[i].args)} - ${error}\n`)

      return error(`Failed to call function '${name}' with arguments ${formatExpression(args)}\n ${errors}`, env)
    }
}

const execFunctionApplicationOrDataConstructor = (env, expression) => {
    env.stack.unshift(expression)
    //Each expression is a name, and arguments
    const [name, ...argsUnexecuted] = expression
    //First exec the arguments
    const args = execFunctionArguments(env, argsUnexecuted)
    /*
    const args = args.map((arg) => {
      arg.env = env; 
      return arg
    })
    */
   
    //check if val is a function 
    // if it is a function, execute it.
    if (name === '__debug__') debugger
    const func = env.functions[name]
    if (func !== undefined) {
      if (func.length > 0) {
        debug && print(env, "Executing function application:", formatExpression([name, argsUnexecuted ]))
        if (args.length > 0) {
          debug && print(env, "Evaluating arguments:", formatExpression([name, args]))
        }
        return execFunctionApplication(env, name, args)
      } else {

        debug && print(env, "Returning a data constructor ", formatExpression([name, ...args]))
        return execDataConstructor(env, name, args)
      }
    } else if (foreignFunctions[name] !== undefined) {
      //check if val is a foreign function
      // if it is a function, execute it.
      debug && print(env, "Executing a foreign function ",  formatExpression([name, ...args]))
      const result = foreignFunctions[name](args, env)
      debug && print(env, "Returning from foreign function: ", result)
      result.env = env
      return result
    } else {
      // if the name isn't a function, then we assume it's a data constructor i.e. a function without a definition
      // so we exec the values and return it as is
      debug && print(env, "Returning a new data constructor", formatExpression([name, ...args]))

      return execDataConstructor(env, name, args)
      //TODO, record the constructor for typechecking purposes
    }
}

const exec = (expression) => {
  const env = expression.env

  if (!Array.isArray(expression)) {
    throw new Error('Invalid expression ' + typeof expression  + formatExpression(expression))
  } else if (typeof env !== 'object') {
    console.log('Error at evaluating ', expression, ".")
    throw new Error(`${env} is not an object`)
  } else if (env.stack.length > 100) {
    return error("Stack Overflow", env)
  } else { 
    //if (debug) console.log("Executing expression", formatExpression(expression))
    const fnIndex = expression.indexOf('=>')

    if (fnIndex !== -1 ) {
      //Executing function definition
      return execFunctionDefinition(env, expression)

    //TODO functions are not always literals, account for that
    } else if (typeof expression[0] === 'string') {

      if (env.functions === undefined) {
        throw "System error: Wrong environment"
      }
      return execFunctionApplicationOrDataConstructor(env, expression)
    } else {
      //Exec a bunch of statements
      //console.log("Executing an expression chain ", {expression})

      let localExpression = []
      localExpression.env = env
      for (let anExpression of expression) {
        anExpression.env = {...localExpression.env, stack: []}
        let newExpression = exec(anExpression)
      debug && print(env, "Executing an expression from chain: ", formatExpression(anExpression))
        if (debug) console.log("Updated environment", newExpression.env.functions)
        localExpression = newExpression
      }
      return localExpression
    }
  }
}

const execFunctionDefinition = (env, definition) => {
    const fnIndex = definition.indexOf('=>')
    const [signature, expression] = [definition.slice(0, fnIndex), definition.slice(fnIndex + 1) ]
    const [name, ...args] = signature
    const fun = {args, expression, env}
    if (env.functions[name] === undefined) {
      env.functions[name] = [fun]
    } else {
      env.functions[name].push(fun)
    }
    const result = []
    result.env = env 
    return result
}

const execString = (string, env ) => {
  //console.log(formatExpression(parse(string)))
  expression = parse(string)
  expression.env = env
  return exec(expression)
}

module.exports = { execString}
