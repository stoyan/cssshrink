var unfix = require('../util').unfix;

module.exports = {

  test: function(name, nodes) {
    return name === 'stylesheet';
  },

  process: function(node) {
    var map = {};
    for (var i = 0; i < node.length; i++) {
      if (node[i][0] === 'atruler'
        && node[i][1][0] === 'atkeyword'
        && unfix(node[i][1][1][1]) === 'keyframes') {
          var at = node[i][1][1][1];
          var name = node[i][2][2][1];
          var id = at + ':' + name;
          if (!map[id]) {
            map[id] = [];
          }
          map[id].push(i);
        }
    }
    
    var dupes = [];
    for (var i in map) {
      map[i].pop();
      if (map[i].length) {
        dupes = dupes.concat(map[i]);
      }
    }

    return node.filter(function(__, idx) {
      return dupes.indexOf(idx) === -1
    });
  }
};
