const {name, parse } = require('./../interpreter/parser')
const {formatExpression, print} = require('./../interpreter/helpers')
const {parseFunctionDefinition } = require('./../interpreter/types')

debug = true

const typecheckDataConstructor = (env, name, args) => {
  console.log({env, name, args})
  const expression = args.length > 0 ? [name, ...args.map(typecheck)] : [name]
  if (env.types[name] === undefined) {
    env.types[name] = args
  } else {
    env.types[name] = env.types[name].concat(args)
    console.log(`Adding a new term to type ${name} - ${args}`)
  }
  //console.log("Added a new type to env ", env.types)
  expression.env = env
  return expression
}

const typecheck = (env, expression) => {
  if (!Array.isArray(expression)) {
    throw new Error('Invalid expression: ' + typeof expression + " " + formatExpression(expression))
  } else if (typeof env !== 'object') {
    console.log('Error at evaluating ', expression, ".")
    throw new Error(`${env} is not an object`)
  } else if (env.functions === undefined) {
    throw new Error(`Faulty environment object: ${JSON.stringify(env)}`)
  } else { 
    //if (debug) console.log("Typechecking expression", formatExpression(expression))
    const fnIndex = expression.indexOf('=')

    if (fnIndex !== -1 ) {
      //Executing function definition
      return typecheckFunctionDefinition(env, expression)

    //TODO functions are not always literals, account for that
    } else if (typeof expression[0] === 'string') {

      return typecheckFunctionApplicationOrDataConstructor(env, expression)
    } else {
      //Exec a bunch of statements
      //console.log("Typechecking an expression chain ", {expression})

      let localExpression = []
      localExpression.env = env
      for (let anExpression of expression) {
        anExpression.env = {...localExpression.env}
        let newExpression = typecheck(anExpression.env, anExpression)
      debug && print(env, "Typechecking an expression from chain: ", formatExpression(anExpression))
        if (debug) console.log("Updated environment", newExpression.env.functions)
        localExpression = newExpression
      }
      return localExpression
    }
  }
}

const typecheckFunctionApplicationOrDataConstructor = (env, expression) => {
    debug && print(env, "Typechecking", formatExpression(expression))
    console.log(env)
    //Each expression is a name, and arguments
    const [name, ...argsUnexecuted] = expression
    //First exec the arguments
    const args = argsUnexecuted.map((arg) => {
      const argument = typeof arg === 'string' ? [arg] : arg
      argument.env = env; 
      return argument
    })
    const func = env.functions[name]
    if (func !== undefined) {
        debug && print(env, "Typechecking function application:", formatExpression([name, argsUnexecuted ]))
        return typecheckFunctionApplication(env, name, args)
    } else {
      // if the name isn't a function, then we assume it's a data constructor i.e. a function without a definition
      // so we exec the values and return it as is
      debug && print(env, "Returning a new data constructor", formatExpression([name, ...args]))
      return typecheckDataConstructor(env, name, args)
    }
}

const typecheckFunctionApplication = (env, name, args) => {
    const func = env.functions[name]
    console.log(func.returns)
    return func.returns
}


const newTypeVariable = (argumentName) => argumentName

const determineArgumentType = (env, expression, argument) => {
  console.log("Determining argument type ", argument) 
  console.log("In expression", func) 
  if (argument[0] === ':literal') {
    return argument.slice(1)
  } else if(argument[0] === expression) {
    return newTypeVariable(argument[0])
  } else {
    
  }
}

const cloneEnv = (env, argumentFunctions) => ({
    functions: { ...env.functions, ...argumentFunctions },
    stack: [],
    types: {}
})

const argsToEnv = (arguments) => {
  const env = {}
  for (argument of arguments) {
    if (typeof argument === "string") {
      env[argument] = []
    } else {
       
    }
  }
}

const typecheckFunctionDefinition = (env, definition) => {
  const fun = parseFunctionDefinition(env, definition)
  print(env, `Creating a new function ${fun.name}.`)

  const argumentsEnv = cloneEnv(env, argsToEnv(fun.args))
  const returnType = typecheck(argumentsEnv, fun.expression)
  print(env, `With return type ${returnType}`)
  fun.returns = returnType
  env.functions[fun.name] = fun
  fun.env = env
  return fun
}

exports.typecheck = typecheck
exports.typecheckString = (string, env ) => {
  expression = parse(string)
  expression.env = env
  const result = typecheck(env, expression)
  return result
}

