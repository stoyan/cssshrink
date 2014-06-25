var min = require('csscolormin').min;

module.exports = {

  test: function(name, nodes) {
    return name === 'vhash';
  },

  process: function(node) {
    return ["raw", min('#' + node[1])];
  }

};
