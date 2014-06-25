var cssshrink = require('../index.js');
var prettyugly = require('prettyugly');
var bscss = require('bscss');
var gzip = require('gzip-js');

shrink = function(css, uglyonly, browser) {
  if (!css) {
    return '';
  }
  
  if (browser) {
    css = bscss.transform(css, browser);
  }

  return uglyonly
    ? prettyugly.ugly(css)
    : cssshrink.shrink(css);
};

pretty = function(css) {
  return prettyugly.pretty(css);
};

gz = function(css) {
  return gzip.zip(css, {level: 9}).length;
};

getBrowswerOptions = function() {
  var opts = [];
  var me = bscss.stringGetStringIdStringFromUserAgentSring(navigator.userAgent);
  bscss.browsers.forEach(function(b) {
    opts.push(
      '<option name="browser" value="%s" id="%s" %me>%s</option>'
      .replace(/%s/g, b)
      .replace(/%me/, b === me ? 'selected' : '')
    );
  });
  return opts;
};

