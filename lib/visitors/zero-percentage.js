module.exports = {

  test: function(name, nodes) {
    return name === 'percentage';
  },

  process: function(node) {
    if (node[1][1] !== '0') {
      return node;
    }
    return ['number', '0'];
  }

};
