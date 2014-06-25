module.exports = {

  test: function(name, nodes) {
    return name === 'ruleset';
  },

  /*
  a {  ; ; ; }

  ['stylesheet',
    ['ruleset',
      ['selector',
        ['simpleselector',
          ['ident', 'a'],
          ['s', ' ']]],
      ['block',
        ['s', '  '],
        ['decldelim'],
        ['s', ' '],
        ['decldelim'],
        ['s', ' '],
        ['decldelim'],
        ['s', ' ']]]]
  */

  process: function(node) {
    // spaces and trailing delims have been stripped
    // if there's nothing left, it's empty
    if (node[2].length < 2) { // 1st is the 'block' node
      return false;
    }
    // check for multiple ;s
    for (var i = 1; i < node[2].length; i++) {
      if (node[2][i][0] !== 'decldelim' && node[2][i][0] !== 's') {
        return node;
      }
    }

  }
};
