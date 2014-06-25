module.exports = {

  test: function(name, nodes) {
    return name === 'value';
  },

  process: function(node) {
    var newnode = [];

    for (var i = 0; i < node.length; i++) {
      var type = node[i][0];
      var next_type = node[i + 1] && node[i + 1][0];

      if (type !== 'unary') {
        newnode.push(node[i]);
        continue; // no changes
      }

      if (next_type !== 'dimension' && next_type !== 'number') {
        newnode.push(node[i]);
        continue; // no changes
      }

      if (node[i][1] === '+') {
        continue; //  +101 => 101, +1px => 1px
      }

      if (next_type === 'number' && node[i + 1][1] === '0') {
        continue; // -0 => 0
      }

      newnode.push(node[i]);
    }

    return newnode;
  }

};
