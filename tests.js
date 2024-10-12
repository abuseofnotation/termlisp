const assert = require('node:assert/strict');
const { execString, env } = require('./interpreter/interpreter')

const throws = (code, message) => assert.throws(() => execString(code, env()), message)

throws('(foo a b = a)(foo x y = y)', /Repeating signature/)
throws('(foo a b = a', /Parsing/)
