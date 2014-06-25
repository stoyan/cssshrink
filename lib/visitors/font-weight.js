module.exports = {

  test: function(name, nodes) {
    return name === 'declaration' && nodes[1][1] === "font-weight";
  },

  process: function(node) {
    if (node[2][1][1] === 'bold') {
      node[2][1][1] = 700;
    } else if (node[2][1][1] === 'normal') {
      node[2][1][1] = 400;
    }
    return node;
  }
};


/*
['stylesheet',
  ['ruleset',
    ['selector',
      ['simpleselector',
        ['ident', 'a']]],
    ['block',
      ['declaration',
        ['property',
          ['ident', 'font-weight']],
        ['value',
          ['ident', 'bold']]],
      ['decldelim']]]]
*/