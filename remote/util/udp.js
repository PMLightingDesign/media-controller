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

  }

  parse(data){
    try {
      let msg = JSON.parse(data);
      if(msg.discovery){
        this.addPlayer(msg);
      }
    } catch (e) {
      console.log("Malformed response from player");
      console.log(data.toString());
    }
  }

  addPlayer(msg){
    let newPlayer = true;
    this.players.forEach((player) => {
      if(JSON.stringify(msg.interfaces) == JSON.stringify(player.interfaces)){
        newPlayer = false;
      }
    });
    if(newPlayer){
      console.log("Adding new player");
      this.players.push(msg);
    }
    console.log(this.players);
  }

  discover(broadcast){
    this.udp.send("DISCOVER", DISCOVERY_PORT, broadcast, (err) => {
      if (err) { console.log(err); }
    })
  }

  static randomPort(base){
    return Math.floor(base + Math.random() * 1000);
  }
}

module.exports = MPVNetUDP;
