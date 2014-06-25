var gonzo = require('gonzales-ast');
var prettyugly = require('prettyugly');

function traverseAST(ast) {
  // individual values, etc., run once
  var value_visitors = [
    require('./visitors/numbers.js'),
    require('./visitors/zero-dimensions.js'),
    require('./visitors/unary.js'),
    require('./visitors/lowercase-props.js'),
    require('./visitors/lowercase-dimensions.js'),
    require('./visitors/@keyframes.js'),
    require('./visitors/pseudo-elements.js'),
    require('./visitors/color-functions.js'),
    require('./visitors/color-hex.js'),
    require('./visitors/color-names.js'),
    require('./visitors/@charset.js'),
    require('./visitors/@import.js'), // before url.js and before quotes.js
    require('./visitors/uri.js'),
    require('./visitors/quotes.js'),
    require('./visitors/font-weight.js'),
    require('./visitors/font-family-unquote.js'),
    require('./visitors/font-family-generic.js'),
    require('./visitors/time.js'),
    require('./visitors/angle.js'),
    require('./visitors/zero-percentage.js'),
  ];

  // run while there's improvement
  var structure_visitors = [
    // structural transforms
    require('./visitors/merge-media.js'),
    require('./visitors/merge-blocks.js'),
    require('./visitors/merge-blocks-in-blocks.js'),

    // dedup
    require('./visitors/dedup-selectors.js'),
    require('./visitors/dedup-declarations.js'),
    require('./visitors/dedup-keyframes.js'),
    // again
    prettyugly.visitors.ugly['dedup-delimiters'],
    prettyugly.visitors.ugly['last-delimiter'],

    // rm empty
    require('./visitors/empty-blocks.js'),
    require('./visitors/empty-media.js'),
  ];

  ast = prettyugly.uglyAST(ast);
  ast = gonzo.traverse(ast, value_visitors);
  var len = JSON.stringify(ast).length;
  var newlen;

  while (1) {
    ast = gonzo.traverse(ast, structure_visitors);
    newlen = JSON.stringify(ast).length;
    if (newlen === len) {
      return ast;
    }
    len = newlen;
  }
}

exports.shrink = function shrink(css) {
  var ast = gonzo.parse(css);
  ast = traverseAST(ast);
  return gonzo.toCSS(ast);
};

exports.shrinkAST = function shrinkAST(ast) {
  return traverseAST(ast);
};
