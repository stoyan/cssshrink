var stripLeadingZero = require('../util').stripLeadingZero;
var these = ['deg', 'grad', 'turn', 'rad'];

var PRECISION = 2;

// prefer `deg` if all else is equal

module.exports = {

  test: function(name, nodes) {
    return name === 'dimension';
  },

  process: function(node) {
    var value = Number(node[1][1]);
    var unit = node[2][1];
    if (isNaN(value) || these.indexOf(unit) === -1) {
      return node;
    }

    if (value === 0) {
      node[1][1] = '0';
      node[2][1] = 'deg';
      return node;
    }

    var all = {
      deg: 0,
      grad: 0,
      turn: 0,
      rad: 0
    };

    var min = getMin(populate(value, unit));
    node[1][1] = min.value;
    node[2][1] = min.unit;
    return node;
  }

};

var fullcircle = {
  turn: 1,
  deg: 360,
  grad: 400,
  rad: 2 * Math.PI
};

function populate(v, u) {
  var all = {}
  for (var i in fullcircle) {
    all[i] = 1 * Number(v * fullcircle[i] / fullcircle[u]).toFixed(PRECISION);
  }
  return all;
}

function getMin(all) {
  var win = {
    value: stripLeadingZero(all.deg),
    unit: 'deg'
  };
  var champion = (win.value + win.unit).length;
  for (var u in all) {
    if (u === 'turn') {
      continue; // lacking browser support
    }
    var challenger = (stripLeadingZero(all[u]) + u).length;
    if (challenger < champion) {
      champion = challenger;
      win = {
        value: stripLeadingZero(all[u]),
        unit: u
      };
    }
  }
  return win;
}