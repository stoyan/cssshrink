var angle = ['deg', 'grad', 'turn', 'rad'];
var time = ['ms', 's'];

module.exports = {

  test: function(name, nodes) {
    return name === 'dimension';
  },

  process: function(node) {
    if (node[1][1] !== '0') {
      return node;
    }

    if (angle.indexOf(node[2][1]) !== -1) {
      node[2][1] = 'deg';
      return node;
    }

    if (time.indexOf(node[2][1]) !== -1) {
      node[2][1] = 's';
      return node;
    }

    return ['number', '0'];
  }

};
