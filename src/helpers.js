const constants = require('./constants.js');
const path = require('path');
const fs = require('fs');

/**
  * @typedef {Object} MPVOptions - Passed options
  * @property {Array} args - Explicit command line arguments
  * @property {boolean} exlusive - Should we launch an instance if there is already one running?
*/

/**
  * This function checks whether the provided path points at a valid option object, if so, returns it, if not, defaults
  * @param {string} optionsPath - Where should we look for options?
  * @returns {MPVOptions} result - A valid set of options
**/

module.exports.getOptions = function(optionsPath){
  if(typeof(optionsPath) != 'undefined'){
    optionsPath = path.resolve(optionsPath);
    if(fs.existsSync(optionsPath)){
      try {
        let options = JSON.parse(fs.readFileSync(optionsPath));
        return options;
      } catch (e) {
        console.log(`No valid JSON found at the following path: ${optionsPath}`);
        console.log(e);
        console.log('Searching for defaults in current working directory...');
      }
    }
  }
  let fallbackPath = process.cwd() + 'player_options.json';

  if(fs.existsSync(fallbackPath)){
    try {
      let options = JSON.parse(fs.readFileSync(fallbackPath));
      return options;
    } catch (e) {
      console.log('No valid JSON found at the default file location ./player_options.json');
    }
  }
  // Fallthrough fail
  return constants.DEFAULTS;
}
