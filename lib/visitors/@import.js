var util = require('../util');

module.exports = {

  test: function(name, nodes) {
    return name === 'atrules' && nodes[1][1] === 'import';
  },

  process: function(node) {
    for (var i = 0; i < node.length; i++) {
      if (node[i][0] === 'uri') {
        if (node[i][1][0] === 'raw') { // unquoted url
          var q = '"';
          // replace with a string quoted with default " and escape other "s
          // later the quotes visitor optimizes " vs '
          node[i] = ['string', [q, util.addslashes(node[i][1][1], q), q].join('')];
        } else if (node[i][1][0] === 'string') {
          // rewrite node throwing out url() and leaving string only
          node[i] = ['string', node[i][1][1]];
        }
      }
    }
    return node;
  }
};

/*
[ 'atrules',
  [ 'atkeyword', [ 'ident', 'import' ] ],
  [ 's', ' ' ],
  [ 'uri', [ 'string', '\'landscape.css\'' ] ],
  [ 's', ' ' ],
  [ 'ident', 'screen' ],
  [ 's', ' ' ],
  [ 'ident', 'and' ],
  [ 's', ' ' ],
  [ 'braces',
    '(',
    ')',
    [ 'ident', 'orientation' ],
    [ 'operator', ':' ],
    [ 'ident', 'landscape' ] ] ]
*/