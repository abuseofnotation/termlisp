const {formatExpression, error, print, removeExtraBrackets, equal} = require('./helpers')

const debug = false


const extractEnv = (args) => args.reduce((env, arg) => {
  if (typeof arg === 'string') {
    env[arg] = null
  } else {
    //TODO make it work for typed args as well
  }
  return env
}, {})


const matchArgument = (env, arg, value) => {
  debug && print(env, "Matching ", formatExpression( arg))
  debug && print(env, "With     ", formatExpression(value))
  if (typeof arg === "string") {
    debug && print(env, "The argument is untyped, works always", formatExpression( arg))
    return arg
  } else {
    [argumentType, argumentName] = arg
    debug && print(env, "The argument should be of type ", formatExpression( argumentType))
    if (typeof value === "string") {
    debug && print(env, "The argument is of unknown type, adding a constraint", formatExpression( argumentType))
      return [argumentType, argumentName]
    } else {
      [valType, valName] = value
      if (valType !== argumentType) {
        return {error: `Expected ${argumentName} to be '${argumentType}' but got ${valType}`}
      } else {
        return matchArguments(env, argumentName, valName)
      }
    }
  }
}

const getFunctionApplicationType = ( env, [args, expression], argValues) => {

  const argsCorrected = args.map((arg, i) => matchArgument(env, arg, argValues[i]))

  debug && print(env, "Matching ", formatExpression( args))
  debug && print(env, "With     ", formatExpression(argValues))
  debug && print(env, "Got      ", formatExpression(argsCorrected))
  debug && print(env, "expression", formatExpression(expression))
  return [argsCorrected, expression]
}



const getFunctionTypes = (env, args, expression) => {
  const [name, ...fnArgs] = expression
  debug && print(env, "Searching for function ", formatExpression(name))
  if (env.functions[name] === undefined) {
    return [args, name]
  } else {
    //results = env.functions[name].map(({types}) => getFunctionApplicationType(env, types, fnArgs))
    return getFunctionApplicationType(env, env.functions[name][0].types, fnArgs)
  }
}


exports.parseFunctionDefinition = (env, definition) => {
  const fnIndex = definition.indexOf('=')
  const [signature, expression] = [definition.slice(0, fnIndex), definition.slice(fnIndex + 1) ]
  const [name, ...args] = signature
  debug && print(env, "Analysing : ", name)
  const types = getFunctionTypes(env, args, removeExtraBrackets(expression))
  debug && print(env, "Registering function: ", name)
  debug && print(env, "with types          : ", types)
  return ({args, types, expression, env})
}



