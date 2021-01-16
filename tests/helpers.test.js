const { getOptions } = require('../src/helpers.js');

if(process.argv.length > 2){
  console.log("TEST: Looking for options in the user specified path...");
  console.log(getOptions(proces.argv[2]));
}

console.log("TEST: Checking fallback path");
console.log(getOptions());

console.log("TEST: Checking default options object");
console.log(getOptions());
