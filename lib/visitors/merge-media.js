module.exports = {

  test: function(name, nodes) {
    return name === 'stylesheet';
  },

  process: function(node) {
    var newnode = [];
    newnode.push(node[0]);
    var prevq = false;
    for (var i = 1; i < node.length; i++) {
      if (node[i][0] === 'atruler' && node[i][1][0] === 'atkeyword' && node[i][1][1][1] === 'media') {
        var q = JSON.stringify(node[i][2]);
        if (q === prevq) {
          // same mq, merge the kids
          appendRulesets(newnode[newnode.length - 1][3], node[i][3]);
        } else {
          newnode.push(node[i]);
          prevq = q;
        }
      } else {
        newnode.push(node[i]);
        prevq = false;
      }
    }
    return newnode;
  }
};


function appendRulesets(r1, r2) {
  for (var i = 1; i < r2.length; i++) {
    r1.push(r2[i]);
  }
}