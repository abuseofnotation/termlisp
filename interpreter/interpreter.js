const {name, parse } = require('./parser')
const {formatExpression, parseFunctionDefinition} = require('./helpers')
const {patternMatchArgumentsByNames} = require('./pattern-match')
const foreignFunctions = require('./foreign-functions')

const debug = true

const print = (env, message, ...args) => console.log((env.stack.map(() => "-").join("")) + message , ...args)


const error = (error, env, object) => {
  const trace = env.stack.map((line) => "   at "+ formatExpression(line) + "\n")
  throw `Error: ${error} \n ${trace}`
  return (['error', error, env, object])
}

const execFunctionArguments = (env, argsUnexecuted) => {
  const makeEnv = () => ({...env, stack: env.stack.slice()})
  return argsUnexecuted.map((arg) => {
    const argument = typeof arg === 'string' ? [arg] : arg
    return argument
  })
}

const cloneEnv = (env, argumentFunctions, stack) => ({
    stack,
    functions: { ...env.functions, ...argumentFunctions },
    types: env.types,
})

const execDataConstructor = (env, name, args) => {
  const expression = args.length > 0 ? [name, ...args.map(exec)] : [name]
  expression.env = env
  return expression
}

const execFunctionApplicationExpression = (env, func, functionArguments) => {
      const expression = typeof func.expression === 'string' ? [func.expression] : func.expression
      expression.env = cloneEnv(func.env, functionArguments, env.stack.slice())
      debug && print(env, "Evaluating expression  :", formatExpression([functionArguments, func.expression]))
      if (functionArguments.length > 0) {
        debug && print(env, "with local environment :", functionArguments)
      }
      //debug && print(env, "with global environment:", func.env.functions)

      const result = exec(expression)
      debug && print( env, "Returning result  :", formatExpression(result))

      // We return the old environment in order not to pollute the global scope
      // with the vals that are local to the function
      result.env = env
      return result
}

const execFunctionApplication = (env, name, args) => {
  const prettify = (a) => a.map((arg) => typeof arg === 'string' ? [arg] : arg)
  const implementations = env.functions[name]
  if (implementations !== undefined) {
    env.stack.unshift([name, args])
    const patternMatches = implementations.map((func) => 
      patternMatchArgumentsByNames(prettify(func.args), func.env, args, env,  exec)
    )
    const patternMatchIndex = patternMatches.findIndex(({type}) => type !== 'error')
    if (patternMatchIndex !== -1) {
      const func = implementations[patternMatchIndex]
      debug && print(env, "found matching function implementation", formatExpression([func.args, func.expression]))
      const functionArguments = patternMatches[patternMatchIndex]
      return execFunctionApplicationExpression(env, func, functionArguments)
    } else {
      const errors = patternMatches.map(({error, }, i) =>
    `${formatExpression(implementations[i].args)} - ${error}\n`)

      return error(`Failed to call function '${name}' with arguments ${formatExpression(args.map(exec))}\n ${errors}`, env)
    }

  } else if (foreignFunctions[name] !== undefined) {
    //check if val is a foreign function
    // if it is a function, execute it.
    debug && print(env, "Executing a foreign function ",  formatExpression([name, ...args]))
    const result = foreignFunctions[name](args, exec)
    debug && print(env, "Returning from foreign function: ", result)
    result.env = env
    return result
  } else {
      return error(`Failed to call function '${name}' with arguments ${formatExpression(args.map(exec))}\n No such function is defined`, env)
  }
}

const execFunctionApplicationOrDataConstructor = (env, name, argsUnexecuted) => {
    
    //First exec the arguments
    const args = argsUnexecuted.map((arg) => {
      const argument = typeof arg === 'string' ? [arg] : arg
      argument.env = env; 
      return argument
    })
    const firstLetter = name[0]



    if (firstLetter === firstLetter.toLowerCase()) {
      debug && print(env, "Applying a function", formatExpression([name, ...args]))
      return execFunctionApplication(env, name, args)
    } else {
      debug && print(env, "Returning a data constructor ", formatExpression([name, ...args]))
      return execDataConstructor(env, name, args)
    }
}



/*
    env.stack.unshift(expression)
    //Each expression is a name, and arguments
    const [name, ...argsUnexecuted] = expression
    //First exec the arguments
    const args = argsUnexecuted.map((arg) => {
      const argument = typeof arg === 'string' ? [arg] : arg
      argument.env = env; 
      return argument
    })
   
    //check if val is a function 
    // if it is a function, execute it.
    const func = env.functions[name]
    if (func !== undefined) {
      if (func.length > 0) {
        debug && print(env, "Executing function application:", formatExpression([name, argsUnexecuted ]))
        return execFunctionApplication(env, name, args)
      } else {
        debug && print(env, "Returning a data constructor ", formatExpression([name, ...args]))
        return execDataConstructor(env, name, args)
      }
    } else if (foreignFunctions[name] !== undefined) {
      //check if val is a foreign function
      // if it is a function, execute it.
      debug && print(env, "Executing a foreign function ",  formatExpression([name, ...args]))
      const result = foreignFunctions[name](args, exec)
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
*/

const exec = (expression) => {

  const env = expression.env
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
    if (debug) print(env, "Executing expression", formatExpression(expression))
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
    const fun = parseFunctionDefinition(env, definition)
    const name = definition[0]
    if (env.functions[name] === undefined) {
      debug && console.log(`Registering a new function ${name}`)
      env.functions[name] = [fun]
    } else {
      debug && console.log(`Registering a new implementation of ${name}`)
      env.functions[name].push(fun)
    }
    const result = env.functions[name]
    result.env = env 
    return result
}

const execString = (string, env ) => {
  expression = parse(string)
  expression.env = env
  const result = exec(expression)
  return result
}

module.exports = { execString}
