var trim = require('prettyugly').util.trim;

module.exports = {

  test: function(name, nodes) {
    return name === 'uri';
  },

  process: function(node) {
    trim(node);

    if (node[1][0] === 'string') { // as opposed to "raw" which is unquoted url
      // try to unquote
      var raw = node[1][1].slice(1, -1);
      if (/[\s\(\)"']/.test(raw)) {
        return node;
      }
      node[1] = ['raw', raw];
    }

    //var colorstr = node[1][1] + '(' + stringify(node[2]) + ')';
    //return ["string", min(colorstr)];
    return node;
  }

};
