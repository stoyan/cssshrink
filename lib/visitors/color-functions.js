var min = require('csscolormin').min;

function stringify(node) {
  var str = ''
  for (var i = 1; i < node.length; i++) {
    if (node[i][0] === 'number') {
      str += node[i][1];
    } else if (node[i][0] === 'operator' && node[i][1] === ',') {
      str += ',';
    } else if (node[i][0] === 'percentage') {
      str += node[i][1][1] + '%';
    }
  }
  return str;
}

var functions = [
  'rgb',
  'rgba',
  'hsl',
  'hsla',
  'cmyk',
  'hsv',
  'hsva'
];

module.exports = {

  test: function(name, nodes) {
    return name === 'funktion' && functions.indexOf(nodes[1]) !== -1;
  },

  process: function(node) {
    var colorstr = node[1][1] + '(' + stringify(node[2]) + ')';
    return ["raw", min(colorstr)];
  }

};
