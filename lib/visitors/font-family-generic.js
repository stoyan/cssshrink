// non-generic fonts don't make sense after a generic one

var generic = [
  'sans-serif',
  'serif',
  'fantasy',
  'cursive',
  'monospace'
];

module.exports = {

  test: function(name, nodes) {
    return name === 'declaration' && nodes[1][1] === "font-family";
  },

  process: function(node) {
    var newnode = [node[0], node[1], [node[2][0]]];
    var generic_found = false;

    for (var i = 1; i < node[2].length; i++) {

      if (node[2][i][0] === 'important') {
        newnode[2].push(node[2][i]);
        return newnode;
      }

      var value = node[2][i][1].toLowerCase();
      if (!generic_found && generic.indexOf(value) !== -1) {
        generic_found = true;
        node[2][i][1] = value; // lowercase generic
        newnode[2].push(node[2][i]);
      }
      if (!generic_found) {
        newnode[2].push(node[2][i]);
      }

    }
    return newnode;
  }
};

