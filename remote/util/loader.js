const fs = require('fs');

window.loadComponent = function(URL){
  try {
    let file = fs.readFileSync(URL);
    const parser = new DOMParser();
  } catch (e) {
    console.log('Invalid path or file');
    console.log(e);
  }

}
