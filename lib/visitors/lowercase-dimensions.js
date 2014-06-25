module.exports = {

  test: function(name, nodes) {
    return name === 'dimension';
  },

  process: function(node) {
    node[2][1] = node[2][1].toLowerCase();
    return node;
  }

};
