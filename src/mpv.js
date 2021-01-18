const EventEmitter = require('events');
const { spawn } = require('child_process');
const { checkBinary, isUnixLike, isUnique } = require('./env.js');
const { getOptions } = require('./helpers.js');
const net = require('net');
const constants = require('./constants.js');

/**
  * @typedef {Object} ControllerOptions - Options for the controller class
  * @property {number} eventDepth - How many event records should we keep?
  * @property {number} errorDepth - How many error records should we keep?
*/

/**
  * @typedef {Object} MPVOptions - Passed options
  * @property {Array} args - Explicit command line arguments
  * @property {boolean} exlusive - Should we launch an instance if there is already one running?
  * @property {ControllerOptions} controllerOptions - Options for the controller class
*/

/** This class spawns and controls a MPV player instance */
class MPVController extends EventEmitter {
  /**
  * Initialize the player with some default options
  * @param {MPVOptions} options - The options for this player instance
  */
  constructor(options){
    super();
    // If no options are provided, get local or defaults
    if(typeof(options) == 'undefined'){
      options = getOptions();
    }
    if(typeof(options.optionsPath) != 'undefined'){
      options = getOptions(options.optionsPath);
    }

    this.binary = checkBinary({ debug: false });
    this.exclusive = options.exclusive;
    this.args = options.args;

    this.cp = null;
    this.status = 'NOT_STARTED';

    this.responseCache = new Array();
    this.responseCacheDepth = options.controllerOptions.responseCacheDepth;

    this.instanceID = -1;

  }

  start(){
    // Check if this can be the only MPV player on the system
    this.unique = isUnique('mpv');
    this.isUnixLike = isUnixLike();

    console.log(this.unique);

    if(this.exclusive && this.unique.pids.length > 0){
      this.close('OTHER_INSTANCES_RUNNING');
      return -1;
    } else {

      this.socketSuffix = `mpvsocket${this.unique.pids.length}`

      if(this.isUnixLike){
        this.socketName = `/tmp/${this.socketSuffix}`;
        this.eol = '\n';
      } else {
        this.socketName = `\\\\.\\pipe\\${this.socketSuffix}`
        this.eol = '\r\n';
      }

      this.instanceID = this.unique.pids.length;

      this.args.push(`--input-ipc-server=${this.socketName}`);

      this.cp = spawn(this.binary.path, this.args);

      this.status = 'STARTED';

      if(typeof(this.socket) == 'undefined'){
        this.createIPCSocket();
      }

      this.cp.stdout.on('data', (data) => {
        this.parseStdOut(data);
      });

      this.cp.stderr.on('data', (data) => {
        this.parseStdOut(data);
      });

      this.cp.on('close', (code) => {
        this.status = 'PLAYER_CLOSED';
        this.close("PLAYER_APP_TERMINATED");
      });

      this.cp.on('exit', (code) => {
        this.status = 'PLAYER_CLOSED';
        this.close("PLAYER_APP_TERMINATED");
      });

      return this.instanceID;
    }
  }

  end(){
    if(this.isUnixLike){
      this.cp.kill('SIGHUP');
    } else {
      this.cp.kill('SIGINT');
    }

    this.close("PARENT_TERMINATED");
  }

  createIPCSocket(){
    console.log("Connecting to player instance...");
    try {
      this.socket = net.createConnection(this.socketName);
    } catch (e) {
      console.log("IPC Connection error");
      setTimeout(this.createIPCSocket, 100);
      return;
    }

    this.socket.on('ready', () => {
      console.log("IPC Ready");
    });

    this.socket.on('data', (data) => {
      this.parseJSON(data);
    });

    this.socket.on('error', (e) => {
      setTimeout(() => { this.createIPCSocket() }, 100);
    });
  }

  parseJSON(data){
    try {
      data = data.toString().split('\n');
      data.forEach((json) => {
        if(json.length > 0){
          this.lastJSON = JSON.parse(json.replace('\n', '').replace('\r', ''));
          this.cacheResponse(this.lastJSON);
        }
      });
    } catch (e) {
      console.log(e);
    }
  }

  cacheResponse(response){
    this.emit('response', response);
    if(this.responseCache.length >= this.responseCacheDepth){
      this.responseCache.shift();
    }
    this.responseCache.push(response);
  }

  parseStdOut(data){
    let dataResponse = {
      stdout: undefined
    }

    // Slice off leading zeros or returns
    if(data[0] == 0x20 || data[0] == 0x0d){
      data = data.slice(1, data.length);
    }
    // Slice off tailing zeros or returns
    if(data[data.length-1] == 0x20 || data[data.length-1] == 0x0d){
      data = data.slice(0, data.length-1);
    }
    // Slice off leading zeros or returns
    if(data[0] == 0x1b){
      data = data.slice(1, data.length);
    }

    data = data.toString();
    if(data.substr(0,2) == '[K'){ data = data.substr(2, data.length) }
    if(data[0] == 'A' || data[0] == 'V'){
      if(!data.includes('AO:') && !data.includes('VO:')){
        // This is playback progress'
        this.parsePlaybackProgress(data);
      } else {
        dataResponse.stdout = data;
      }
    } else if(data[0] == '('){
      let closeBracketIndex = -1;
      for(let i = 0; i < data.lenth; i++){
        if(data[i] == ')'){ closeBracketIndex = i; }
      }
      if(closeBracketIndex > 0){
        let innerWord = data.slice(1, closeBracketIndex).toString();
        if(innerWord == "Paused"){
          this.parsePlaybackProgress(data.slice(closeBracketIndex+2, data.length));
        } else {
          dataResponse.stdout = data;
        }
      } else {
        dataResponse.stdout = data;
      }
    } else if (data[0] == '['){
      dataResponse.stdout = data;
    }
    if(typeof(dataResponse.stdout) != 'undefined'){
      this.cacheResponse(dataResponse);
    }
  }

  parsePlaybackProgress(progress){
    console.log("progress:" + progress);
  }

  close(reason){
    this.emit('close', reason);
  }

  ipc(json){
    let buf = JSON.stringify(json) + this.eol;
    this.socket.write(buf, (err) => {
      if(err){ console.log(err); }
    });
  }

}

module.exports = MPVController;
