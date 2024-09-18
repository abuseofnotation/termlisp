const error = (error, env, object) => ({type: 'error', error, env, object})
const {formatExpression, equal, print} = require('./helpers')

const debug = false

const formatEnvironment = (object) => Object.keys(object)
  .map((key) => formatExpression([
    [key], 
  ])).join('\n')

const removeExtraBrackets = (expression) => Array.isArray(expression) && expression.length === 1 ? expression[0] : expression


const patternMatchArgumentsByNames = (names, namesEnv, args, env, exec) => {

  const execThunk = val => exec(val.env, val)

  if (names.length > 0) {
    if (debug) print(env, `Matching expressions ${formatExpression(names)} with values ${formatExpression(args)}`)
    //if (debug) console.log(`with environment`, env.functions)
  }

  const argumentEnv = {}
  for (let i = 0; i < names.length; i++) {  
    let name = names[i]
    let value = args[i]
    if (value === undefined) {
      return error(`No value supplied for ${formatExpression(name)}`)
    } else if (false) {
      //TODO check if name === func.name (results in infinite loop)
    } else {
       if (debug) print(env, `Matching expression ${formatExpression(name)} with value ${formatExpression(value)}`);
      if (!Array.isArray(name)) {
        //throw Error('System error: Invalid signature')
        argumentEnv[name] = [{ args: [], expression: value, env}]

      } else if (name.length === 1) {
        argumentEnv[name[0]] = [{ args: [], expression: value, env}]

      // Literal argument
      // We check if the value is equal to the argument
    
      } else if (name[0] === ':literal') {
        if (name.length === 2) {
          // We have to execute the values in order to compare
          nameMatch = [name[1]]
          const nameExecuted = exec(namesEnv, nameMatch)
          const valueExecuted = execThunk(value)
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

        if (debug) print(env, `Parsing lambda expression ${formatExpression(name)}`);
        if (name.length === 2) {
            const functionName = name[1]
            // If the argument is a function that is already defined, 
            // search for it's implementation and attach it.
            if (value.length === 1) {

              if (debug) print(env, `Lambda expression references to an existing function ${formatExpression(value[0])}`);
              const implementation = value.env.functions[value[0]]
              if (debug) print(env, `Function has an implementation`, implementation);
              argumentEnv[functionName] = implementation
            } else {
            // If the function is given inline, execute it
              if (debug) print(env, `Lambda expression references to a new function ${formatExpression(value)}`);
              argumentEnv[functionName] = execThunk(value)
            }
        } else {
          throw Error(`Wrong use of the :lambda keyword, called with ${literal.length} arguments, but expected 1.`)
        }

      } else if (name[0] === ':list') {
        debug && console.log(`Executing a :list expression at index ${i}`)
        if (name.length === 2) {
          const argumentName = name[1]
            debug && console.log(`Assigning ${argumentName} to ${formatExpression(args.slice(i))}`)
            argumentEnv[argumentName] = [{ args: [], expression: ['List'].concat(args.slice(i)), env}]
            break
        } else {
          throw Error(`Wrong use of the :list keyword, called with ${literal.length} arguments, but expected 1.`)
        }

      // Data structure
      // We destruct it and match it's contents recursively

      } else {
        const [nameType, ...nameVals] = name
        const [argType, ...argVals] = execThunk(value)
        // Typecheck 
        if (nameType !== argType) {
          return error(`Expected a type '${nameType}', but got ${argType}`, env, {name, value})
        } else {
          if (debug) console.log(`Assigning values ${formatExpression(nameVals)} with values ${formatExpression(argVals)}`);
          //TODO report errors from here 
          // (actually it seems that it works as is, hm...)
          Object.assign(argumentEnv, patternMatchArgumentsByNames(nameVals, namesEnv, argVals, env, exec))
        }
      }
    }
  }
  if (debug && Object.keys(argumentEnv).length > 0) console.log("Constructed argument environment", argumentEnv)

  return argumentEnv
}

module.exports = {patternMatchArgumentsByNames}
