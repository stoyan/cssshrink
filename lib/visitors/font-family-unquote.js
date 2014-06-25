module.exports = {

  test: function(name, nodes) {
    return name === 'declaration' && nodes[1][1] === "font-family";
  },

  process: function(node) {
    for (var i = 1; i < node[2].length; i++) {
      if (node[2][i][0] === 'string') { // try to unquote
        var raw = node[2][i][1].slice(1, -1); // sans quotes
        // strip spaces, the rest should be just letters or -
        if (/^[a-z-]*$/i.test((raw.replace(/\s/g, '')))) {
          node[2][i] = ['raw', raw];
        }
      }
    }
    return node;
  }
};

