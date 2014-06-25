var keywords = require('csscolormin').keywords;

var props = [
  'color',
  'background',
  'background-color',
  'background-image',
  'border',
  'border-color',
  'border-top',
  'border-right',
  'border-bottom',
  'border-left',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'outline',
  'outline-color',
  'text-shadow',
  'box-shadow'
];

module.exports = {

  test: function(name, nodes) {
    return name === 'declaration' && props.indexOf(nodes[1][1]) !== -1;
  },

  process: function(node) {
    for (var i = 1; i < node[2].length; i++) {
      if (node[2][i][0] === 'ident' && keywords[node[2][i][1]]) {
        node[2][i] = ['raw', keywords[node[2][i][1]]];
      } else if (node[2][i][0] === 'funktion' && node[2][i][1][1].indexOf('gradient') !== 1) {
        node[2][i] = this.process(node[2][i]);
      }
    }
    return node;
  },


};
