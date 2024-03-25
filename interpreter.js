const {name, parse } = require('./parser')

const reportError = (error, env, object) => {
  console.log("Error: " + error, object)
  for (line of env.stack) {
    console.log("  at  "+ formatExpression(line))
  }
  throw error
}

const formatExpression = (expression) => {
  if (Array.isArray(expression)) {
    return '(' + expression.map(formatExpression).join(' ') + ')'
  } else {
    return expression
  }
}

const isConstant = ( word ) => {
  return word[0] !== word[0].toLowerCase();
}

const argsToEnv = (names, args, env) => {
  if (names.length !== args.length) {
    reportError("Wrong number of arguments", env, {names, args})
  } else {
    const argumentEnv = execFunctionArguments(env, names).reduce((argumentEnv, name, i) => {
      let value = args[i]
      console.log(`Matching expression ${formatExpression(name)} with value ${formatExpression(value)}`);

      if (typeof name === 'string') {
        // Constant only match other constants
        if (isConstant(name)) {
          if (value !== name) {
            return reportError(`Unsuccessfull pattern match, called with ${name}, expected ${value}`, env, {names, args})
          // Constant only match other constants
          } else {
            //console.log(name, value)
            // We don't do anything in case of a successfull pattern match
          }
        // normal values match everything
        } else {
          argumentEnv[name] = [{ args: [], expression: value}]
        }
      } else {
        // We assume that the argument is a pattern match
        // we typecheck it and add the elements
        const [nameType, ...nameVals]= name
        const [argType, ...argVals]= value
        if (nameType !== argType) {
          reportError(`Expected a(n) ${nameType}, but got ${argType}`, env, {name, value})
        } else if (nameVals.length !== argVals.length){
          reportError(`Expected a ${nameVals.length} arguments , but got ${argVals.length}`, env, {nameVals, argVals})
        } else {
          Object.assign(argumentEnv, argsToEnv(nameVals, argVals, env))
        }
      }
      return argumentEnv
    }, {})

    //console.log("Argument environment", argumentEnv)
    return argumentEnv
  }
}

const primitiveEnv = {
  print: (value, env) => {
    //console.log('Environment:', env.functions)

  for (line of env.stack) {
    console.log("   "+ formatExpression(line))
  }

    // only needed in lazy evaluation
    //value = exec(env, value)[1]
    console.log(formatExpression(value))
  },

  "#": () => undefined,
  env: (value, env) => console.log(env)
}

const execPrimitive = (env, expression) => 
    env.functions[expression] && env.functions[expression].length > 0 ? exec(env, env.functions[expression][0].expression)[1] : expression

const execFunctionDefinition = (env, definition) => {
    const fnIndex = definition.indexOf('=>')
    const [signature, expression] = [definition.slice(0, fnIndex), definition.slice(fnIndex + 1) ]
    const [name, ...args] = signature
    const fun = {args, expression}
    if (env.functions[name] === undefined) {
      env.functions[name] = [fun]
    } else {
      env.functions[name].push(fun)
    }
    //console.log(exec(env, functionExpression))
    return [env, null]
}

//TODO perhaps we can use the function that execs a bunch of statements sequentially
const execFunctionArguments = (env, argsUnexecuted) => argsUnexecuted.map((arg) => exec(env, arg)[1])

const cloneEnv = (env, functions, stackFrame) => ({
    stack: env.stack.slice(),
    functions: {...env.functions, ...functions},
    types: env.types,
})

const execDataConstructor = (env, name, args) => {
  if (args.length > 0) {
    return [env, [name, ...args]]
  } else {
    return [env, name]
  }
}

const execFunctionApplication = (env, expression) => {
    env.stack.push(expression)
    //Each expression is a name, and arguments
    const [name, ...argsUnexecuted] = expression
    //First exec the arguments
    const args = execFunctionArguments(env, argsUnexecuted)

    //Arguments are evaluated lazily, when printing
    //const args = argsUnexecuted
    //console.log("Executing arguments:", {argsUnexecuted, args})

    //check if val is a function 
    // if it is a function, execute it.
    if (env.functions[name] !== undefined) {
      if (env.functions[name].length > 0) {
        const func = env.functions[name][0]
        const functionArguments = argsToEnv(func.args.slice(), args, env)
        //console.log("Executing function call", {func, args, functionArguments})
        const newEnv = cloneEnv(env, functionArguments)
        return exec(newEnv, func.expression)
      } else {

        // console.log("Returning a data constructor", [name, ...args])
      
        return execDataConstructor(env, name, args)
      }
    } else if (primitiveEnv[name] !== undefined) {
      //check if val is a foreign function
      // if it is a function, execute it.
      return [env, primitiveEnv[name](args, env)]
    } else {
      // if the name isn't a function, then we assume it's a data constructor i.e. a function without a definition
      // so we exec the values and return it as is
      /*
      env.types[name] = env.types[name] || new Set()
      if (args.length === 1 && typeof args[0] === 'string') {
        env.types[name].add(args[0])
        // console.log("Added new constant value", env.types[name])
      }
      */
      // console.log("Returning a new data constructor", [name, ...args])

      return execDataConstructor(env, name, args)
      //TODO, record the constructor for typechecking purposes
      //: return [cloneEnv(env, {[name]: {}}, []), [name, ...args]]
    }
}

const exec = (env, expression) => {
  if (typeof env !== 'object') {throw `${env} is not an object` }
  if (env.stack.length > 100) {
    reportError("Stack Overflow", env)
  }
  if (!Array.isArray(expression)) {
    return exec(env, [expression])
  } else {
    //console.log("Executing expression", formatExpression(expression))
    //console.log("with stack          ", formatExpression(env.stack))
    //console.log("with environment", env.functions)
    const fnIndex = expression.indexOf('=>')

    if (fnIndex !== -1 ) {
      //Executing function definition
      return execFunctionDefinition(env, expression)

    //TODO functions are not always literals, account for that
    } else if (typeof expression[0] === 'string') {

      console.log("Executing application:", formatExpression(expression))
      return execFunctionApplication(env, expression)
    } else {
      //Exec a bunch of statements

      let localEnv = env
      let localExpression = null
      for (let anExpression of expression) {
        // console.log("Executing an expression from chain: ", formatExpression(anExpression))
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
