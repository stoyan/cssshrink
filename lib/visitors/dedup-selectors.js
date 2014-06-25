module.exports = {

  test: function(name, nodes) {
    return name === 'selector';
  },

  process: function(node) {
    var selectors = {};
    var newnode = [];
    newnode.push(node[0]);

    for (var i = 1; i < node.length; i++) {
      if (node[i][0] === 'simpleselector') {
        selectors[JSON.stringify(node[i])] = node[i];
      }
    }

    var keys = Object.keys(selectors);
    keys.forEach(function(k, idx) {
      newnode.push(selectors[k]);
      if (idx < keys.length - 1) {
        newnode.push(['delim']);
      }
    });

    return newnode;
  }

};
