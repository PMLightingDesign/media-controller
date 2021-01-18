const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const constants = require('./constants.js');
const os = require('os');

// (Get-Process mpv).Id

/**
  * This function will return all non-loopback ipv4 interfaces
  * @param {boolean} DEBUG - Logs to console the names of all interfaces being checked
  * @returns {Array} result - A list of valid interfaces
**/

function getNetworkInterfaces(DEBUG){
  let ips = new Array();
  let interfaces = os.networkInterfaces();
  for(const [key, value] of Object.entries(interfaces)){
    if(DEBUG){ console.log(`Checking adapter: ${key}`); }
    value.forEach((ip) => {
      if(ip.family == 'IPv4' && ip.address != '127.0.0.1'){
        ips.push(ip);
      }
    });
  }
  return ips;
}

module.exports.getNetworkInterfaces = getNetworkInterfaces;

/** @module env */

/**
  * This function will inform whether there is already an instance of the app running
  * @param {string} appName - Passed options
  * @returns {boolean} result - Is there already an instance running?
**/

function isUnique(appName){
  let result = {
    isUnique: true
  }
  result.pids = getPIDs(appName);
  if(result.pids.length > 0){
    result.isUnique = false;
  }
  return result;
}

module.exports.isUnique = isUnique;

/**
  * This function will inform whether there is already an instance of the app running
  * @param {string} appName - Passed options
  * @returns {Array} result - List of exsiting PIDs
**/

function getPIDs(appName){
  let result = new Array();
  let bufs;
  if(isUnixLike()){
    bufs = getNonNullBuffers(spawnSync("pgrep", ['mpv']));
    if(bufs.length == 0) { return result } else {
      let pids = bufs[0].split('\r');
    }
  } else {
    bufs = getNonNullBuffers(spawnSync("powershell.exe", ["(Get-Process mpv).Id"]));
    if(bufs[0].length == 0) { return result } else {
      let pids = bufs[0].split('\r\n');
      pids.forEach((str) => {
        try {
          let pid = parseInt(str);
          if(!isNaN(pid)){
            result.push(pid);
          }
        } catch (e) {
          /* It's not a valid PID */
        }
      });
    }
  }
  return result;
}

/**
  * This function will return whether the system is Unix Like
  * @returns {boolean} isUnixLike
**/
function isUnixLike(){
  return !( os.platform().indexOf('win') > -1 );
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
  * @property {string} path - The first valid path found
  * @property {string} playerName - The name of the mediaplayer
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
    let whereResult = spawnSync(whereApp, [ playerName ]);
    let validPaths = validateWhereResults(whereResult); // Get a list of valid paths, if any
    if(options.debug){ console.log(validPaths); }
    if(!validPaths.success){
      result.reason = `${constants.PLAYER_NAME} binary does not exist in PATH`;
    } else {
      let versionResult = spawnSync(validPaths.paths[0], ['--version']);
      result.reason = "Valid Player Found";
      result.version = parseVersionOutput(versionResult, path);
      result.success = true;
      result.path = validPaths.paths[0];
      result.playerName = constants.PLAYER_NAME;
      return result;
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
    parts = new Array();
    getNonNullBuffers(whereResult).forEach((line, i) => {
      line = line.split(' ');
      line.forEach((part) => {
        if(part.length > 1){ parts.push(part); }
      });
    });
  } else {
    parts = new Array();
    getNonNullBuffers(whereResult).forEach((line, i) => {
      if(line.length > 0){ // Windows command returns both null values and empty buffers
        parts.push(line.replace('\r\n', ''));
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

/**
  * This function parses the output from APP --version and returns it
  * @param {SpawnSyncResult} rawOutput - passed from the output of spawnSync
  * @param {string} path - The singlet appname / path
  * @returns {string} - Version number
**/

function parseVersionOutput(rawOutput, path){
  if(path == 'mpv'){
    return getNonNullBuffers(rawOutput)[0].split(' ')[1];
  } else {
    return "ERR: Invalid App. Can't parse version number";
  }
}

/**
  * This function gets all non null buffers from the output array and returns them as an array of strings
  * @param {SpawnSyncResult} spawnSyncOutput - passed from the output of spawnSync
  * @returns {Array} - Version number
**/

function getNonNullBuffers(spawnSyncOutput){
  let strings = new Array();
  spawnSyncOutput.output.forEach((item, i) => {
    if(item != null){
      strings.push(item.toString());
    }
  });
  return strings;
}
