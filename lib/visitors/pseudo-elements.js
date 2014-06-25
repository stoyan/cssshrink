var whitelist = [
  'after',
  'before',
  'first-letter',
  'first-line'
];

module.exports = {

  test: function(name, nodes) {
    return name === 'pseudoe';
  },

  process: function(node) {
    var name = node[1][1];
    if (whitelist.indexOf(name.trim()) !== -1) {
      node[0] = 'pseudoc';
    }
    return node;
  }
};
