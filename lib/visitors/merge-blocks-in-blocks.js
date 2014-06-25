// same as merging blocks in a stylesheet
// only it's in a media query block

module.exports = {

  test: function(name, nodes) {
    return name === 'atrulers';
  },
  process: require('./merge-blocks.js').process
};
