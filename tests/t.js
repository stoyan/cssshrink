var shrink = require('../index.js');
var prettyugly = require('prettyugly');
var fs = require('fs');
var path = require('path');

var dir = fs.readdirSync;
var read = fs.readFileSync;

var p = './unit';
dir(p).forEach(function(f) {

  if (path.extname(f) !== '.css') {
    return;
  }

  var cont = read('./unit/' + f).toString();

  var pieces = cont.split('/** expected **/');
  var pretty = false;

  if (!pieces[1]) {
    var pieces = cont.split('/** expected pretty **/');
    pretty = true;
  }

  if (pieces.length !== 2) {
    console.log(f + ' is not a valid test');
  }

  var after = shrink.shrink(pieces[0]).trim();
  var expected = pieces[1].trim();

  if (pretty) {
    after = prettyugly.pretty(after).trim();
  }

  if (expected !== after) {
    console.log('OH NOES! Trouble in ' + f);
    console.log('in:');
    console.log(pieces[0]);
    console.log('expected:');
    console.log(expected);
    console.log('got:');
    console.log(after);
    process.exit(1);
  }

});

console.log('all is fine')