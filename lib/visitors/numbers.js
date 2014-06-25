var stripLeadingZero = require('../util').stripLeadingZero;

module.exports = {

  test: function(name, nodes) {
    return name === 'number';
  },

  process: function(node) {
    var n = Number(node[1]);
    if (isNaN(n)) {
      return; // drop this
    }

    node[1] = stripLeadingZero(n);
    return node;
  }

};
