var unfix = require('../util').unfix;

module.exports = {

  test: function(name, nodes) {
    return name === 'atruler'
      && nodes[0] === 'atkeyword'
      && unfix(nodes[1][1]) === 'keyframes';
  },

  process: function(node) {
    var atrulers = node[3];
    for (var i = 0; i < atrulers.length; i++) {
      var type = atrulers[i][0];
      if (type === 'ruleset') {
        if (atrulers[i][1] && atrulers[i][1][0] === 'selector') {
          if (atrulers[i][1][1] && atrulers[i][1][1][0] === 'simpleselector') {
            var sel = atrulers[i][1][1][1];
            if ((sel[0] === 'ident' && sel[1] === 'from') ||
                (sel[0] === 'percentage' && sel[1][1] === '0')) {
              sel[0] = 'raw'; // raw, otherwise all 0% turn to 0
              sel[1] = ['0%'];
            }
            if (sel[0] === 'percentage' && sel[1][1] === '100') {
              sel[0] = 'ident';
              sel[1] = 'to';
            }
          }
        }
      }
    }
    return node;
  }
};
