module.exports = {

  test: function(name, nodes) {
    return name === 'stylesheet';
  },

  process: function(node) {

    var prev_s, prev_b;
    var newnode = [];
    newnode.push(node[0]);

    for (var i = 1; i < node.length; i++) {
      if (node[i][0] !== 'ruleset') {
        prev_s = null;
        prev_b = null;
        newnode.push(node[i]);
        continue;
      }
      var selector = JSON.stringify(node[i][1]);
      var block    = JSON.stringify(node[i][2]);
      if (prev_b === block) {
        // drop the block, merge selectors
        appendSelector(newnode[newnode.length - 1][1], node[i][1]);
        prev_s = JSON.stringify(newnode[newnode.length - 1][1]);
      } else if (prev_s === selector) {
        // merge block to the previous
        appendBlock(newnode[newnode.length - 1][2], node[i][2]);
        prev_b = JSON.stringify(newnode[newnode.length - 1][2]);
      } else {
        // keep going
        prev_s = selector;
        prev_b = block;
        newnode.push(node[i]);
      }
    }

    return newnode;
  }

};


function appendSelector(selector1, selector2) {
  selector1.push(['delim']);
  for (var i = 1; i < selector2.length; i++) {
    selector1.push(selector2[i]);
  }
}

function appendBlock(b1, b2) {

  if (b1[b1.length - 1][0] !== 'decldelim') {
    b1.push(['decldelim']);
  }

  for (var i = 1; i < b2.length; i++) {
    b1.push(b2[i]);
  }
}