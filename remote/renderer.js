let MPVNetUDP = require('./util/udp.js');

let udp = new MPVNetUDP();

document.getElementById("discover-players").addEventListener("click", () => {
  udp.discover('192.168.1.255');
});
