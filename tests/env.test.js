const { checkBinary, isUnixLike } = require('../src/env.js');

console.log(isUnixLike());

checkBinary({ debug: true });
