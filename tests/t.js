var shrink = require('../index.js');
var prettyugly = require('prettyugly');
var fs = require('fs');
var path = require('path');

var dir = fs.readdirSync;
var read = fs.readFileSync;

var p = path.resolve(__dirname, "unit");
dir(p).forEach(function(f) {

  if (path.extname(f) !== '.css') {
    return;
  }

  var fileFullPath = path.resolve(__dirname, "unit", f);
  var cont = read(fileFullPath).toString();

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

  // \r\n pitfall
  var NEW_LINE = "----NEW_LINE----";
  expected = expected.replace(/\r\n|\r|\n/g, NEW_LINE);
  after = after.replace(/\r\n|\r|\n/g, NEW_LINE);

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