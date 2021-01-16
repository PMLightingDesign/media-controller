const MPVController = require('./src/mpv.js');
const readline = require('readline');

let options = undefined;
if(process.argv.length > 2){
  options = {
    optionsPath: process.argv[2]
  }
}

let mpv = new MPVController(options);
console.log(mpv);
mpv.start();

mpv.on('data', (data) => {
  console.log(data);
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function getInput(){
  rl.question('Enter a command:\n', (answer) => {
    try {
      let json = JSON.parse(answer);
      mpv.ipc(json);
    } catch (e) {
      console.log("That wasn't valid JSON");
      console.log(answer);
    }
    getInput();
  });
}

getInput();
