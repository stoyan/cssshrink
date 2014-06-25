var except = ['deg', 'grad', 'turn', 'rad'];

module.exports = {

  test: function(name, nodes) {
    return name === 'dimension';
  },

  process: function(node) {
    if (node[1][1] !== '0') {
      return node;
    }

    if (except.indexOf(node[2][1]) !== -1) {
      node[2][1] = 'deg';
      return node;
    }
    return ['number', '0'];
  }

};
