const { parse } = require('./parser')

const reportError = (error, env) => {
  console.log("Error: " + error)
  for (line of env.__stack) {
    console.log("  at  "+ formatExpression(line))
  }
}

const formatExpression = (expression) => {
  if (Array.isArray(expression)) {
    return '(' + expression.map(formatExpression).join(' ') + ')'
  } else {
    return expression
  }
}


const argsToEnv = (names, args, externalEnv) => {
  if (names.length !== args.length) {
    console.error({names, args})
    throw new Error("Wrong number of arguments")
  } else {
    return names.reduce((env, name, i) => {
      if (typeof name === "string") {
        env[name] = { args: [], expression: args[i]}
      } else {
        // We assume that the argument is a pattern match
        // we typecheck it and add the elements
        const arg = args[i]
        const [nameType, ...nameVals]= name
        const [argType, ...argVals]= arg
        if (nameType !== argType) {
          console.log({name, arg})
          console.log({names, args})
          reportError(`Expected a ${nameType}, but got ${argType}`, externalEnv)
        } else if (nameVals.length !== argVals.length){
          console.log({nameVals, argVals})
          reportError(`Expected a ${nameVals.length} arguments , but got ${argVals.length}`, externalEnv)
        } else {
          //TODO use execFunctionDefinition
          Object.assign(env, argsToEnv(nameVals, argVals, externalEnv))
        }
      }
      return env
    }, {})
  }
}

const primitiveEnv = {
  print: (value, env) => console.log(formatExpression(value)),
  "#": () => undefined
}

const execPrimitive = (env, expression) => 
    env[expression] ? exec(env, env[expression].expression)[1] : expression

const execFunctionDefinition = (env, definition) => {
    const fnIndex = definition.indexOf('=>')
    const [signature, functionExpression] = [definition.slice(0, fnIndex), definition.slice(fnIndex + 1) ]
    const [name, ...args] = signature
    env[name] = {args, expression: functionExpression}
    return [env, null]
}

const execFunctionApplication = (env, expression) => {
    //Each expression is a name, and arguments
    const [name, ...argsUnexecuted] = expression
    //First exec the arguments
    const args = argsUnexecuted.map((arg) => {
      const envArgument = exec(env, arg)
      if (envArgument.length !== 2) {
        console.log(envArgument)
        reportError(`Expected for exec to return an env and an evaluated argument`, env)
      } else {
        return envArgument[1]
      }
    })
    //check if val is a function 
    // if it is a function, execute it.
    if (env[name] !== undefined) {
      const func = env[name]
      // console.log("Executing function call", func, args)
      return exec(Object.assign({}, env, argsToEnv(func.args.slice(), args, env)), func.expression)
    } else if (primitiveEnv[name] !== undefined) {
      //check if val is a foreign function
      // if it is a function, execute it.
      return [env, primitiveEnv[name](args, env)]
    // if the name isn't a function, then we assume it's a data constructor
    // so we exec the values and return it as is
    } else {
      return [env, [name, ...args]]
    }
}

const exec = (env, expression) => {
  if (typeof env !== 'object') {throw `${env} is not an object` }

  env.__stack = env.__stack || []
  env.__stack.unshift(expression)

  if (!Array.isArray(expression)) {
    //console.log("Executing primitive", expression)
    return [env, execPrimitive(env, expression)]

  } else {
    const fnIndex = expression.indexOf('=>')
    //console.log("Executing composite", expression)

    if (expression.length === 1) {
      // Remove needless brackets
      return exec(env, expression[0])

    } else if (fnIndex !== -1 ) {
      //Executing function definition
      return execFunctionDefinition(env, expression)

    //TODO functions are not always literals, account for that
    } else if (typeof expression[0] === 'string') {
      a = execFunctionApplication(env, expression)
      //console.log(a)
      return a
      //return execFunctionApplication(env, expression)

    } else {
      //Exec a bunch of statements

      let localEnv = env
      let localExpression = null
      //console.log({localEnv, expression})
      for (let anExpression of expression) {
        let [newLocalEnv, newExpression] = exec(localEnv, anExpression)
        localEnv = newLocalEnv
        localExpression = newExpression
      }
      return [localEnv, localExpression]
    }
  }
}

const execString = (string, env ) => {
  //console.log(formatExpression(parse(string)))
  return exec(env, parse(string))
}

module.exports = { execString}
