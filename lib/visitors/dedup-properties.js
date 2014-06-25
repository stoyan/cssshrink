module.exports = {

  test: function(name, nodes) {
    return name === 'block';
  },

  process: function(node) {
    var cache = {};
    return node.filter(function(n) {
      if (n[0] !== 'declaration') {
        return true;
      }
      var str = JSON.stringify(n);
      if (cache[str]) {
        return false;
      }
      cache[str] = 1;
      return true;
    });
  }
};


/*
[ 'block',
 [ 'declaration',
   [ 'property', [Object] ],
   [ 'value', [Object] ] ],
 [ 'decldelim' ],
 [ 'declaration',
   [ 'property', [Object] ],
   [ 'value', [Object] ] ] ]
*/