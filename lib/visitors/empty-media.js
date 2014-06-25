module.exports = {

  test: function(name, nodes) {
    return name === 'atruler' && nodes[0] === 'atkeyword' && nodes[1][1] === 'media';
  },

  process: function(node) {
    // node[3] == selectors in the media block
    if (node[3].length > 1) {
      return node;
    }
  }
};


/*
[ 'atruler',
  [ 'atkeyword', [ 'ident', 'media' ] ],
  [ 'atrulerq', [ 's', ' ' ], [ 'ident', 'print' ], [ 's', ' ' ] ],
  [ 'atrulers' ] ]
*/