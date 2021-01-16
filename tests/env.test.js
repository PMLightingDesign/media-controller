const { checkBinary, isUnixLike } = require('../src/env.js');

console.log(isUnixLike());

let playerResult = checkBinary({ debug: false });
console.log(playerResult);
