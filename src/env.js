const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const constants = require('./constants.js');

/** @module env */

/**
  * This function will return whether the system is Unix Like
  * @returns {boolean} isUnixLike
**/
function isUnixLike(){
  return !( require('os').platform().indexOf('win') > -1 );
}
/**
  * Exports: isUnixLike
**/
module.exports.isUnixLike = isUnixLike;

/**
  * @typedef {Object} CheckBinaryOptions - Passed options
  * @property {boolean} debug - Should we enable debugging output?
**/

/**
  * @typedef {Object} CheckBinaryResult - Passed options
  * @property {boolean} success - Are we okay to try to launch MPV?
  * @property {string} reason - If we failed, why?
  * @property {string} version - If valid, let's pass back a version for sanity
**/

/**
  * This function will validate that the mpv binary is compatible, and can be accessed
  * @param {CheckBinaryOptions} options - Passed options
  * @param {string} path - A custom path to the MPV binary
  * @returns {CheckBinaryResult} result - Is the binary valid, and if so, the version nummber. If not, the failure reason
**/
function checkBinary(options = {}, path = 'mpv'){

  let result = { success: false, reason: 'No checks performed', version: null }

  if(path == 'mpv'){ // If we think mpv does not need an explicit path, let's check for that
    let isNix = isUnixLike();
    let whereApp = isNix ? 'whereis' : 'where.exe'; // Assume we have to deal with Powershell, use where.exe
    let playerName = isNix ? constants.PLAYER_NAME : constants.PLAYER_NAME + '.exe'; // Have to be more specific in windows
    let validPaths = validateWhereResults(spawnSync(whereApp, [ playerName ])); // Get a list of valid paths, if any
    if(options.debug){ console.log(validPaths); }
    if(!validPaths.success){
      result.reason = `${constants.PLAYER_NAME} binary does not exist in PATH`;
    } else {
      let versionResult = spawnSync(validPaths.paths[0], ['--version']);
      console.log(versionResult.output[1].toString());
    }
  } else {
    result.reason = "Unrecognized binary name";
  }
  return result;
}
module.exports.checkBinary = checkBinary;

/**
  * @typedef {Object} SpawnSyncResult - The standard output of spawnSync
  * @property {Array} output - The Array of output buffers from the where command
**/

/**
  * @typedef {Object} ValidPaths - The standard output of spawnSync
  * @property {Array} paths - If there are any valid paths, put them here
  * @property {boolean} success - Did we find any valid paths?

/**
  * This function checks whether or not the results from spawnSync(whereApp) produces a valid path
  * @param {SpawnSyncResult} whereResult - passed from the output of spawnSync
  * @returns {boolean} - Output contains a valid path
**/

function validateWhereResults(whereResult){
  // Restult of the search
  let result = { paths: new Array(), success: false };

  // Common container for any number of parts or paths passed back
  let parts;

  // The where and whereis commands report back the results slightly differently
  if(isUnixLike()){
    whereResult.output.forEach((item, i) => {
      if(item != null) {
        item = item.toString();
        parts = item.split(' ');
      }
    });
  } else {
    parts = new Array();
    whereResult.output.forEach((item, i) => {
      if(item != null) {
        if(item.length > 0){ // Windows command returns both null values and empty buffers
          item = item.toString().replace('\r\n', ''); // Replace windows line endings
          parts.push(item);
        }
      }
    });
  }
  // Save and retun any path which is valid
  for(let i = 0; i < parts.length; i++){
    if(fs.existsSync(parts[i])){
      result.paths.push(parts[i]);
    }
  }
  if(result.paths.length > 0){
    result.success = true;
  }
  return result;

}

function parseVersionOutput(rawOutput){

}
