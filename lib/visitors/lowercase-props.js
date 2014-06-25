module.exports = {

  test: function(name, nodes) {
    return name === 'property';
  },

  process: function(node) {
    node[1][1] = node[1][1].toLowerCase();
    return node;  
  }

};
