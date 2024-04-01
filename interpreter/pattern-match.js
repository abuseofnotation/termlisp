const error = (error, env, object) => ({type: 'error', error, env, object})
const {formatExpression, equal} = require('./helpers')

const debug = false

const patternMatchArgumentsByNames = (names, args, env, exec) => {

  if (names.length > 0) {
    if (debug) console.log(`Matching expressions ${formatExpression(names)} with values ${formatExpression(args)}`)
    //if (debug) console.log(`with environment`, env.functions)
  }

  if (names.length !== args.length) {
    return error(`Expected a ${names.length} arguments, but got ${args.length}`, env, {names, args})
  } else {
    const argumentEnv = names.reduce((argumentEnv, name, i) => {

      // Check for errors
    
      let value = args[i]
       if (debug) console.log(`Matching expression ${formatExpression(name)} with value ${formatExpression(value)}`);
      if (!Array.isArray(name)) {
        // When we encounter data constructors,
        // we pattern-match it and add the elements
        //argumentEnv[name] = [{ args: [], expression: value, env}]
        throw 'System error: Invalid signature'

      // Normal argument
      // We pattern-match it and add it to the environment

      } else if (name.length === 1) {
        argumentEnv[name] = [{ args: [], expression: value, env}]

      // Literal argument
      // We check if the value is equal to the argument
    
      } else if (name[0] === ':literal') {
        if (name.length === 2) {
          // We have to execute the values in order to compare
          const nameExecuted = exec(name[1])
          const valueExecuted = exec(value)
          if (equal(nameExecuted, valueExecuted)) {
            // We don't do anything in case of a successfull literal pattern match
          } else {
            return error(`Unsuccessful pattern match, called with ${formatExpression(valueExecuted)}, expected ${formatExpression(nameExecuted)}`, env, {names, args})
          }
        } else {
          stack.push(names)
          return error(`Wrong use of the :literal keyword, called with ${literal.length} arguments, but expected 1.`)
        }

      // Lambda expression
      // We add the function to the environment

      } else if (name[0] === ':lambda') {
        if (name.length === 2) {
          const nameExecuted = exec(name[1])
          if (nameExecuted.length === 1) {
            const functionName = nameExecuted[0]
            // If the argument is a function that is already defined, 
            // search for it's implementation and attach it.
            if (value.length === 1) {
              const implementation = value.env.functions[value[0]]
              argumentEnv[functionName] = implementation
            } else {
            // If the function is given inline, execute it
              argumentEnv[functionName] = exec(value)
            }
          } else {
            throw Error(`Pattern-matching on :lambda expressions is not supported... yet.`)
          }
        } else {
          throw Error(`Wrong use of the :lambda keyword, called with ${literal.length} arguments, but expected 1.`)
        }


      // Data structure
      // We destruct it and match it's contents recursively

      } else {
        const [nameType, ...nameVals] = exec(name)
        const [argType, ...argVals] = exec(value)
        // Typecheck 
        if (nameType !== argType) {
          return error(`Expected a type '${nameType}', but got ${argType}`, env, {name, value})
        } else if (nameVals.length !== argVals.length) {
          return error(`Expected a ${nameVals.length} arguments , but got ${argVals.length} in a pattern match ${formatExpression(name)}`, env, {nameVals, argVals})
        } else {
          if (debug) console.log(`Assigning values ${formatExpression(nameVals)} with values ${formatExpression(argVals)}`);
          //TODO report errors from here 
          // (actually it seems that it works as is, hm...)
          Object.assign(argumentEnv, patternMatchArgumentsByNames(nameVals, argVals, env, exec))
        }
      }
      return argumentEnv
    }, {})

    if (debug && Object.keys(argumentEnv).length > 0) console.log("Constructed argument environment", argumentEnv)
    return argumentEnv
  }
}

module.exports = {patternMatchArgumentsByNames}
