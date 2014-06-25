// only one charset allowed per file
// find the first and hoist it to the top
// delete all others
// this is often a side effect of concatenating files

module.exports = {

  test: function(name, nodes) {
    return name === 'stylesheet';
  },

  process: function(node) {
    var newnode = [];
    newnode.push(node[0]);
    var charsetnode = null;

    for (var i = 1; i < node.length; i++) {
      if (node[i][0] === 'atrules' && node[i][1][0] === 'atkeyword' && node[i][1][1][1] === 'charset') {
        if (!charsetnode) {
          charsetnode = node[i][3];
        }
      } else {
        newnode.push(node[i]);
      }
    }

    if (charsetnode) {
      var ch = ["atrules", ["atkeyword", ["ident", "charset"]], ["s", " "], charsetnode];
      newnode.splice(1, 0, ch);
    }
    return newnode;
  }

};
