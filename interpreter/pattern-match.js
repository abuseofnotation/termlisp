const error = (error, env, object) => ({type: 'error', error, env, object})
const {formatExpression, equal} = require('./helpers')

const debug = false

const patternMatchArgumentsByNames = (names, args, env) => {

  if (debug) console.log(`Matching expressions ${formatExpression(names)} with values ${formatExpression(args)}`)
  if (debug) console.log(`with environment`, env.functions)
  if (names.length !== args.length) {
    return error(`Expected a ${names.length} arguments, but got ${args.length}`, env, {names, args})
  } else {
    const argumentEnv = names.reduce((argumentEnv, name, i) => {
      let value = args[i]
       if (debug) console.log(`Matching expression ${formatExpression(name)} with value ${formatExpression(value)}`);

      if (typeof name === 'string') {
        argumentEnv[name] = [{ args: [], expression: value}]

      // When we encounter data constructors,
      // we pattern-match it and add the elements
      } else if (Array.isArray(name)) {
        if (name[0] === ':literal') {
          if (name.length === 2) {
            const newName = name[1]
            if (equal(newName, value)) {
              //console.log(newName, value)
              // We don't do anything in case of a successfull pattern match
            } else {
              return error(`Unsuccessful pattern match, called with ${formatExpression(value)}, expected ${formatExpression(newName)}`, env, {names, args})
            }
          } else {
            stack.push(names)
            return error(`Wrong use of the :literal keyword, called with ${literal.length} arguments, but expected 1.`)
          }
          
        } else {
          const [nameType, ...nameVals] = name
          const [argType, ...argVals] = value
          if (nameType !== argType) {
            return error(`Expected a type '${nameType}', but got ${argType}`, env, {name, value})
          } else if (nameVals.length !== argVals.length) {
            return error(`Expected a ${nameVals.length} arguments , but got ${argVals.length} in a pattern match ${formatExpression(name)}`, env, {nameVals, argVals})
          } else {

            if (debug) console.log(`Assigning values ${formatExpression(nameVals)} with values ${formatExpression(argVals)}`);
            //TODO report errors from here 
            // (actually it seems that it works as is, hm...)
            Object.assign(argumentEnv, patternMatchArgumentsByNames(nameVals, argVals, env))
          }
        }
      } else {
        console.log(name)
        throw 'System error: Invalid signature'
      }
      return argumentEnv
    }, {})

    if (debug) console.log("Constructed argument environment", argumentEnv)
    return argumentEnv
  }
}

module.exports = {patternMatchArgumentsByNames}
