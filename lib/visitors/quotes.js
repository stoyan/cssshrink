var util = require('../util');

module.exports = {

  test: function(name, nodes) {
    return name === 'string';
  },

  process: function(node) {
    var str = util.stripslashes(node[1].slice(1, -1));

    // try consistent " first
    var q = '"';
    var doubles = str.match(/"/g);
    if (!doubles) {
      node[1] = [q, str, q].join('');
      return node;
    }

    // go with fewer quotes to escape
    var singles = str.match(/'/g);
    if (!singles || (singles.length < doubles.length)) {
      q = "'";
    }

    node[1] = [q, util.addslashes(str, q), q].join('');
    return node;
  }

};

