const {name, parse } = require('./parser')

const printError = ({error, env, object}) => {
  const trace = env.stack.map((line) => "   at "+ formatExpression(line) + "\n")
  throw `Error: ${error} \n ${trace}`
}
const error = (error, env, object) => ({type: 'error', error, env, object})

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

  console.log({names, args})
  if (names.length !== args.length) {

    return error(`Expected a ${name.length} arguments, but got ${arg.length}`, env, {names, args})
  } else {
    const argumentEnv = execFunctionArguments(env, names).reduce((argumentEnv, name, i) => {
      let value = args[i]
      // console.log(`Matching expression ${formatExpression(name)} with value ${formatExpression(value)}`);

      if (typeof name === 'string') {

        // Constant only match other constants
        if (isConstant(name)) {
          if (value !== name) {
            return error(`Unsuccessfull pattern match, called with ${value}, expected ${name}`, env, {names, args})
          // Constant only match other constants
          } else {
            //console.log(name, value)
            // We don't do anything in case of a successfull pattern match
          }

        // Normal values match everything
        } else {
          argumentEnv[name] = [{ args: [], expression: value}]
        }


      // When we encounter data constructors,
      // we pattern-match it and add the elements
      } else {
        const [nameType, ...nameVals] = name
        const [argType, ...argVals] = value
        if (nameType !== argType) {
          return error(`Expected a type '${nameType}', but got ${argType}`, env, {name, value})
        } else if (nameVals.length !== argVals.length) {
          return error(`Expected a ${nameVals.length} arguments , but got ${argVals.length} in a pattern match ${formatExpression(name)}`, env, {nameVals, argVals})
        } else {
          //TODO report errors from here
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

  /*
  for (line of env.stack) {
    console.log("   "+ formatExpression(line))
  }
  */

    // only needed in lazy evaluation
    //value = exec(env, value)[1]
    console.log(formatExpression(value))
  },

  "#": () => undefined,
  env: (value, env) => console.log(env)
}

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
const execFunctionArguments = (env, argsUnexecuted) => argsUnexecuted.map((arg) => exec({...env, stack: env.stack.slice()}, arg)[1])

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

const execFunctionApplication = (env, name, args) => {
    const implementations = env.functions[name]
    const patternMatches = env.functions[name].map((func) => 
      argsToEnv(func.args.slice(), args, env)
    )
    const patternMatchIndex = patternMatches.findIndex(({type}) => type !== 'error')
    if (patternMatchIndex !== -1) {
      const func = implementations[patternMatchIndex]
      const functionArguments = patternMatches[patternMatchIndex]
      const newEnv = cloneEnv(env, functionArguments)
      return exec(newEnv, func.expression)
    } else {

      const errors = patternMatches.map(({error, }, i) =>
    `${formatExpression(implementations[i].args)} - ${error}\n`)

      printError(error(`Failed to call function '${name}' with arguments ${formatExpression(args)}\n ${errors}`, env))
      
    }
}

const execFunctionApplicationOrDataConstructor = (env, expression) => {
    env.stack.unshift(expression)
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
        return execFunctionApplication(env, name, args)
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
    printError({error: "Stack Overflow", env})
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

      // console.log("Executing application:", formatExpression(expression))
      return execFunctionApplicationOrDataConstructor(env, expression)
    } else {
      //Exec a bunch of statements

      let localEnv = env
      let localExpression = null
      for (let anExpression of expression) {
        // console.log("Executing an expression from chain: ", formatExpression(anExpression))
        let [newLocalEnv, newExpression] = exec({...localEnv, stack: []}, anExpression)
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
