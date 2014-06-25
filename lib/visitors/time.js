var stripLeadingZero = require('../util').stripLeadingZero;

module.exports = {

  test: function(name, nodes) {
    return name === 'dimension';
  },

  process: function(node) {
    var u = node[2][1];
    if (u !== 'ms' && u !== 's') {
      return node;
    }
    var ms_value = u === 'ms'
      ? node[1][1]
      : node[1][1] * 1000;

    var seconds = stripLeadingZero(ms_value / 1000);
    var milisec = stripLeadingZero(ms_value);
    if (milisec.length + 2 > seconds.length + 1) { // ms=2,s=1
      node[2][1] = 's';
      node[1][1] = seconds;
    } else {
      node[2][1] = 'ms';
      node[1][1] = milisec;
    }
    return node;
  }

};
