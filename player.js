const MPVController = require('./src/mpv.js');
const udp = require('dgram').createSocket('udp4');

let PORT = 6969;

let options = undefined;
if(process.argv.length > 2){
  // We have an options file to load
  options = {
    optionsPath: process.argv[2]
  }
} if(process.argv.length > 3) {
  // We have an explicit remote control port
  let port = parseInt(process.argv[3]);
  if(!isNaN(port)){
    PORT = port;
  }
}

let mpv = new MPVController(options);
console.log(mpv);
let INSTANCE_ID = mpv.start();

mpv.on('data', (data) => {
  console.log(data);
});

mpv.on('response', (response) => {
  console.log(response);
});

mpv.on('close', (reason) => {
  console.log(`Player closed: ${reason}`);
});

PORT += INSTANCE_ID + 1;

udp.bind(PORT);

udp.on('listening', () => {
  console.log(`Remote UDP port open on: ${PORT}`);
});
