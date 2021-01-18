const EventEmitter = require('events');

const DISCOVERY_PORT = 6969;

class MPVNetUDP extends EventEmitter {
  constructor(){
    super();

    this.udp = require('dgram').createSocket('udp4');

    this.port = MPVNetUDP.randomPort(9000);

    this.udp.bind(this.port, (err) => {
      if(err) {
        console.log(err);
        this.emit('error', err);
      } else {
        console.log(`Listening on port: ${this.port}`);
      }
    });

    this.udp.on('message', (data, rinfo) => {
      this.parse(data, rinfo);
    });

    this.players = new Array();

    this.broadcastIP = '127.0.0.255';

    this.timeout = 3000;

    setInterval(() => {
      this.heartbeat();
    }, 500);

  }

  heartbeat(){
    let now = new Date().getTime();
    let killList = new Array();
    if(this.players.length > 0){
      this.players.forEach((player, i) => {
        console.log(player.heartbeat - (now - this.timeout));
        if(player.heartbeat < (now - this.timeout)){
          killList.push(i);
        }
        this.directive(i, 'PING');
      });
    }
    if(killList.length > 0){
      console.log(killList);
    }
  }

  command(player, command){
    this.send(player, JSON.stringify(command));
  }

  directive(player, directive){
    this.send(player, JSON.stringify({
      playerDirective: true,
      directive: directive
    }));
  }

  send(player, command){
    let ip = this.players[player].ip;
    let port = this.players[player].port;
    this.udp.send(command, port, ip, (err) => {
      if(err){ console.log(err); }
    });
  }

  parse(data){
    try {
      let msg = JSON.parse(data);
      if(msg.discovery){
        this.addPlayer(msg);
      } else {
        this.emit('message', msg);
      }
    } catch (e) {
      console.log(e);
      console.log("Malformed response from player");
      console.log(data.toString());
    }
  }

  addPlayer(msg){
    let newPlayer = true;
    this.players.forEach((player) => {
      if(JSON.stringify(msg.interfaces) == JSON.stringify(player.interfaces)){
        player.heartbeat = new Date().getTime();
        newPlayer = false;
      }
    });
    if(newPlayer){
      console.log("Adding new player");
      msg.ip = this.getPrimaryIP(msg);
      msg.heartbeat = new Date().getTime();
      console.log(msg);
      this.players.push(msg);
      this.emit('discovery', {
        event: "ADD",
        player: msg
      });
    }
  }

  getPrimaryIP(msg){
    for(let i = 0; i < msg.interfaces.length; i++) {
      let iface = msg.interfaces[i];
      console.log(MPVNetUDP.getOctets(this.broadcastIP)[0] == MPVNetUDP.getOctets(iface.address)[0]);
      if(MPVNetUDP.getOctets(iface.address)[0] == MPVNetUDP.getOctets(this.broadcastIP)[0]){
        return iface.address;
      }
    }
  }

  discover(broadcast){
    this.broadcastIP = broadcast;
    this.udp.send("DISCOVER", DISCOVERY_PORT, broadcast, (err) => {
      if (err) { console.log(err); }
    })
  }

  static randomPort(base){
    return Math.floor(base + Math.random() * 1000);
  }

  static getOctets(ip){
    return ip.split('.');
  }
}

module.exports = MPVNetUDP;
