const MPVController = require('./src/mpv.js');
const udp = require('dgram').createSocket('udp4');
const discovery = require('dgram').createSocket('udp4');
const { getNetworkInterfaces } = require('./src/env.js');

let options = undefined;
let restartFlag = false;

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

mpv.on('response', (response) => {
  console.log(response);
  broadcast(response);
});

mpv.on('close', (reason) => {
  console.log(`Player closed: ${reason}`);
  if(restartFlag){
    mpv.start();
    restartFlag = false;
  }
});

let PORT = 6969 + INSTANCE_ID + 1;
let clients = new Array();

udp.bind(PORT);

udp.on('listening', () => {
  console.log(`Remote UDP port open on: ${PORT}`);
});

udp.on('message', (data, rinfo) => {
  data = JSON.parse(data);
  if(data.playerDirective){
    if(data.directive == 'REGISTER'){
      registerSender(rinfo);
    } else if(data.directive == 'RESTART_PLAYER'){
      restartMediaPlayer();
    } else if(data.directive == 'RESTART_PLAYER_ARGS'){
      mpv.args = data.args;
      restartMediaPlayer();
    } else if(data.directive == 'PING'){
      sendVitals(udp, rinfo);
    }
  } else {
    mpv.ipc(data);
  }
});

function restartMediaPlayer(){
  restartFlag = true;
  mpv.end();
}

function registerSender(rinfo){
  clients.forEach((client) => {
    if(client.ip == rinfo.ip && client.port == rinfo.port){
      // Do Nothing
    } else {
      clients.push(rinfo);
      console.log("Clients");
    }
  });
  if(clients.length == 0){
    clients.push(rinfo);
    console.log(clients);
  }
}

function broadcast(response){
  clients.forEach((client) => {
    udp.send(JSON.stringify(response), client.port, client.address, (err) => {
      if(err) { console.log(err); }
    });
  });
}

discovery.bind(6969);

discovery.on('listening', () => {
  console.log(`Discovery active on 6969`);
});

discovery.on('message', (data, rinfo) => {
  let msg = data.toString();
  if(msg == "DISCOVER"){
    console.log(`Sending player info to ${rinfo.address}`);
    sendVitals(discovery, rinfo);
  }
});

function sendVitals(sender, rinfo){
  discovery.send(
    JSON.stringify({
      discovery: true,
      interfaces: getNetworkInterfaces(),
      port: PORT,
      instance: INSTANCE_ID
    }), rinfo.port, rinfo.address, (err) => {
      if(err) { console.log(err); }
    }
  );
}
