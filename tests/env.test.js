const { checkBinary, isUnixLike, getNetworkInterfaces } = require('../src/env.js');

console.log(isUnixLike());

let playerResult = checkBinary({ debug: false });
console.log(playerResult);

console.log(getNetworkInterfaces(true));
