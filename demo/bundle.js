(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = require('./lib/bs.js');


},{"./lib/bs.js":2}],2:[function(require,module,exports){
// parser
var gonzo = require('gonzales-ast');
// properties
var cssprops = require('cssprops');
// visitors
var prefix = require('./visitors/prefix.js');
var iehacks = require('./visitors/iehacks.js');
var props = require('./visitors/props.js');
var empty_delimeters = require('./visitors/empty-delimiters.js');
var media_queries = require('./visitors/media-queries.js');

function traverseAST(ast, browser) {
  var conf = browsers[browser];
  if (conf.prefix) {
    prefix.setAllowedPrefix(conf.prefix);
  } else {
    prefix.setNoPrefix();
  }

  iehacks.setAllowedHacks(conf.hacks ? conf.hacks : []);

  props.setProperties(cssprops[browser]);

  var visitors = [
    prefix,
    iehacks,
    props,
    empty_delimeters];

  if (conf.nomq) {
    visitors.push(media_queries);
  }

  return gonzo.traverse(ast, visitors);
}

var browsers = {
  chrome: {
    prefix: 'webkit'
  },
  ios: {
    prefix: 'webkit'
  },
  safari: {
    prefix: 'webkit'
  },
  firefox: {
    prefix: 'moz'
  },
  opera: {
    prefix: 'o'
  },
  ie6: {
    hacks: ['_', '*'],
    nomq: true
  },
  ie7: {
    hacks: ['*'],
    nomq: true
  },
  ie8: {
    prefix: 'ms',
    nomq: true
  },
  ie9: {
    prefix: 'ms'
  },
  ie10: {
    prefix: 'ms'
  },
  ie11: {
    prefix: 'ms'
  },

};

exports.transform = function transform(css, browser) {
  var ast = gonzo.parse(css);
  ast = traverseAST(ast, browser);
  return gonzo.toCSS(ast);
};

exports.transformAST = function transformAst(ast, browser) {
  return traverseAST(ast, browser);
};

exports.browsers = Object.keys(browsers);

exports.stringGetStringIdStringFromUserAgentSring = function(ua) {
  if (ua.indexOf('Firefox') !== -1) {
    return 'firefox';
  } else if (ua.indexOf('Chrome') !== -1) {
    return 'chrome';
  } else if (ua.indexOf('Opera') !== -1) {
    return 'opera';
  } else if (ua.indexOf('Safari') !== -1) {
    var name = 'safari';
    if (ua.indexOf('Mobile') !== -1) {
      return 'ios'
    }
    return name;
  } else if (ua.indexOf('Trident/7') !== -1) {
    return 'ie11';
  } else if (ua.indexOf('MSIE 10') !== -1) {
    return 'ie10';
  } else if (ua.indexOf('MSIE 9') !== -1) {
    return 'ie9';
  } else if (ua.indexOf('MSIE 8') !== -1) {
    return 'ie8';
  } else if (ua.indexOf('MSIE 7') !== -1) {
    return 'ie7';
  } else if (ua.indexOf('MSIE 6') !== -1) {
    return 'ie6';
  }
};

},{"./visitors/empty-delimiters.js":3,"./visitors/iehacks.js":4,"./visitors/media-queries.js":5,"./visitors/prefix.js":6,"./visitors/props.js":7,"cssprops":31,"gonzales-ast":32}],3:[function(require,module,exports){
module.exports = {

  test: function(name, nodes) {
    return name === 'block';
  },

  process: function(node) {
    var newnode = [];
    for (var i = 0; i < node.length; i++) {
      if (node[i][0] !== 'decldelim') {
        // not interesting, push and keep going
        newnode.push(node[i]);
        continue;
      }
      if (i === 1) { // No previous node, skip
        continue;
      }

      // If the previous node is space, remove both the
      // space and skip the delimiter
      var prev = node[i - 1];
      if (prev[0] === 's') {
        newnode.splice(i - 1, 1);
      } else {
        newnode.push(node[i]);
      }
    }
    return newnode;
  }

};

},{}],4:[function(require,module,exports){
// TODO: support \9 at the end of a value
// requires gonzales fix
// filed bug #9, oh sweet irony
// https://github.com/css/gonzales/issues/9

module.exports = {

  test: function(name, nodes) {
    // only looking for * or _ in front of a property
    if (name !== 'declaration') {
      return false;
    }
    var first = nodes[1][1].charAt(0);
    return first === '_' || first === '*';
  },

  process: function(node) {
    // if the prefix is in the map, keep the declaration
    // but strip the prefix first
    // if prefix not in the map, drop the declaration
    var prop = node[1][1][1];

    if (this.hacksMap[prop.charAt(0)]) { // it's a keeper!
      node[1][1][1] = prop.substring(1);
      return node;
    }
    return false;
  },

  hacksMap: {},

  setAllowedHacks: function(hacks) {
    var map = this.hacksMap = {};
    hacks.forEach(function(h) {
      map[h] = 1;
    });
    return this;
  }

};

},{}],5:[function(require,module,exports){
// @media screen, projection AND (color) {}
/*
['stylesheet',
  ['atruler',
    ['atkeyword',
      ['ident', 'media']],
    ['atrulerq',
      ['s', ' '],
      ['ident', 'screen'],
      ['operator', ','],
      ['s', ' '],
      ['ident', 'projection'],
      ['s', ' '],
      ['ident', 'AND'],
      ['s', ' '],
      ['braces', '(', ')',
        ['ident', 'color']],
      ['s', ' ']],
    ['atrulers']]]
*/

module.exports = {

  test: function(name, nodes) {
    return name === 'atruler' && nodes[1][1] === 'media';
  },

  process: function(node) {
    var query = node[2];
    for (var i = 0; i < query.length; i++) {
      if (query[i][0] === 'braces') {
        return false;
      }
      if (query[i][0] === 'ident' &&
          this.unsupported.indexOf(query[i][1]) !== -1) {
        return false;
      }
    }
    return node;
  },

  unsupported: ['AND', 'NOT', 'OR']
};

},{}],6:[function(require,module,exports){
module.exports = {

  test: function(name, nodes) {
    // only looking for prefixed properties
    // node is e.g. [ 'property', [ 'ident', '-webkit-border-radius' ] ]
    return name === 'declaration' && nodes[1][1].charAt(0) === '-';
  },

  process: function(node) {
    // if wrong for the current browser, drop the declaration
    if (node[1][1][1].indexOf(this.prefix) !== 0) {
      return false;
    }
    return node;
  },

  prefix: null,

  setAllowedPrefix: function(prefix) {
    this.prefix = '-' + prefix + '-';
    return this;
  },

  setNoPrefix: function() {
    this.prefix = null;
    return this;
  }

};

},{}],7:[function(require,module,exports){
module.exports = {

  test: function(name, nodes) {
    // prefixes are fine, worry about all others
    return name === 'declaration' && nodes[1][1].charAt(0) !== '-';
  },

  process: function(node) {
    var prop = node[1][1][1];
    if (this.propertyMap[prop]) { // ok, known prop
      return node;
    }
    return false;
  },

  propertyMap: {},

  setProperties: function(allowed) {
    var props = this.propertyMap = {};
    allowed.forEach(function(p) {
      props[p] = 1;
    });
    return this;
  }

};

},{}],8:[function(require,module,exports){
/* MIT license */
var convert = require("color-convert");

module.exports = {
   getRgba: getRgba,
   getHsla: getHsla,
   getRgb: getRgb,
   getHsl: getHsl,
   getAlpha: getAlpha,

   hexString: hexString,
   rgbString: rgbString,
   rgbaString: rgbaString,
   percentString: percentString,
   percentaString: percentaString,
   hslString: hslString,
   hslaString: hslaString,
   keyword: keyword
}

function getRgba(string) {
   if (!string) {
      return;
   }
   var abbr =  /^#([a-fA-F0-9]{3})$/,
       hex =  /^#([a-fA-F0-9]{6})$/,
       rgba = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d\.]+)\s*)?\)$/,
       per = /^rgba?\(\s*([\d\.]+)\%\s*,\s*([\d\.]+)\%\s*,\s*([\d\.]+)\%\s*(?:,\s*([\d\.]+)\s*)?\)$/,
       keyword = /(\D+)/;

   var rgb = [0, 0, 0],
       a = 1,
       match = string.match(abbr);
   if (match) {
      match = match[1];
      for (var i = 0; i < rgb.length; i++) {
         rgb[i] = parseInt(match[i] + match[i], 16);
      }
   }
   else if (match = string.match(hex)) {
      match = match[1];
      for (var i = 0; i < rgb.length; i++) {
         rgb[i] = parseInt(match.slice(i * 2, i * 2 + 2), 16);
      }
   }
   else if (match = string.match(rgba)) {
      for (var i = 0; i < rgb.length; i++) {
         rgb[i] = parseInt(match[i + 1]);
      }
      a = parseFloat(match[4]);
   }
   else if (match = string.match(per)) {
      for (var i = 0; i < rgb.length; i++) {
         rgb[i] = Math.round(parseFloat(match[i + 1]) * 2.55);
      }
      a = parseFloat(match[4]);
   }
   else if (match = string.match(keyword)) {
      if (match[1] == "transparent") {
         return [0, 0, 0, 0];
      }
      rgb = convert.keyword2rgb(match[1]);
      if (!rgb) {
         return;
      }
   }

   for (var i = 0; i < rgb.length; i++) {
      rgb[i] = scale(rgb[i], 0, 255);
   }
   if (!a && a != 0) {
      a = 1;
   }
   else {
      a = scale(a, 0, 1);
   }
   rgb.push(a);
   return rgb;
}

function getHsla(string) {
   if (!string) {
      return;
   }
   var hsl = /^hsla?\(\s*(\d+)\s*,\s*([\d\.]+)%\s*,\s*([\d\.]+)%\s*(?:,\s*([\d\.]+)\s*)?\)/;
   var match = string.match(hsl);
   if (match) {
      var h = scale(parseInt(match[1]), 0, 360),
          s = scale(parseFloat(match[2]), 0, 100),
          l = scale(parseFloat(match[3]), 0, 100),
          a = scale(parseFloat(match[4]) || 1, 0, 1);
      return [h, s, l, a];
   }
}

function getRgb(string) {
   return getRgba(string).slice(0, 3);
}

function getHsl(string) {
   return getHsla(string).slice(0, 3);
}

function getAlpha(string) {
   var vals = getRgba(string);
   if (vals) {
      return vals[3];
   }
   else if (vals = getHsla(string)) {
      return vals[3];
   }
}

// generators
function hexString(rgb) {
   return "#" + hexDouble(rgb[0]) + hexDouble(rgb[1])
              + hexDouble(rgb[2]);
}

function rgbString(rgba, alpha) {
   if (alpha < 1 || (rgba[3] && rgba[3] < 1)) {
      return rgbaString(rgba, alpha);
   }
   return "rgb(" + rgba[0] + ", " + rgba[1] + ", " + rgba[2] + ")";
}

function rgbaString(rgba, alpha) {
   if (alpha === undefined) {
      alpha = (rgba[3] !== undefined ? rgba[3] : 1);
   }
   return "rgba(" + rgba[0] + ", " + rgba[1] + ", " + rgba[2]
           + ", " + alpha + ")";
}

function percentString(rgba, alpha) {
   if (alpha < 1 || (rgba[3] && rgba[3] < 1)) {
      return percentaString(rgba, alpha);
   }
   var r = Math.round(rgba[0]/255 * 100),
       g = Math.round(rgba[1]/255 * 100),
       b = Math.round(rgba[2]/255 * 100);

   return "rgb(" + r + "%, " + g + "%, " + b + "%)";
}

function percentaString(rgba, alpha) {
   var r = Math.round(rgba[0]/255 * 100),
       g = Math.round(rgba[1]/255 * 100),
       b = Math.round(rgba[2]/255 * 100);
   return "rgba(" + r + "%, " + g + "%, " + b + "%, " + (alpha || rgba[3] || 1) + ")";
}

function hslString(hsla, alpha) {
   if (alpha < 1 || (hsla[3] && hsla[3] < 1)) {
      return hslaString(hsla, alpha);
   }
   return "hsl(" + hsla[0] + ", " + hsla[1] + "%, " + hsla[2] + "%)";
}

function hslaString(hsla, alpha) {
   if (alpha === undefined) {
      alpha = (hsla[3] !== undefined ? hsla[3] : 1);
   }
   return "hsla(" + hsla[0] + ", " + hsla[1] + "%, " + hsla[2] + "%, "
           + alpha + ")";
}

function keyword(rgb) {
   return convert.rgb2keyword(rgb.slice(0, 3));
}

// helpers
function scale(num, min, max) {
   return Math.min(Math.max(min, num), max);
}

function hexDouble(num) {
  var str = num.toString(16).toUpperCase();
  return (str.length < 2) ? "0" + str : str;
}

},{"color-convert":10}],9:[function(require,module,exports){
/* MIT license */

module.exports = {
  rgb2hsl: rgb2hsl,
  rgb2hsv: rgb2hsv,
  rgb2cmyk: rgb2cmyk,
  rgb2keyword: rgb2keyword,
  rgb2xyz: rgb2xyz,
  rgb2lab: rgb2lab,

  hsl2rgb: hsl2rgb,
  hsl2hsv: hsl2hsv,
  hsl2cmyk: hsl2cmyk,
  hsl2keyword: hsl2keyword,

  hsv2rgb: hsv2rgb,
  hsv2hsl: hsv2hsl,
  hsv2cmyk: hsv2cmyk,
  hsv2keyword: hsv2keyword,

  cmyk2rgb: cmyk2rgb,
  cmyk2hsl: cmyk2hsl,
  cmyk2hsv: cmyk2hsv,
  cmyk2keyword: cmyk2keyword,
  
  keyword2rgb: keyword2rgb,
  keyword2hsl: keyword2hsl,
  keyword2hsv: keyword2hsv,
  keyword2cmyk: keyword2cmyk,
  
  xyz2rgb: xyz2rgb,
}


function rgb2hsl(rgb) {
  var r = rgb[0]/255,
      g = rgb[1]/255,
      b = rgb[2]/255,
      min = Math.min(r, g, b),
      max = Math.max(r, g, b),
      delta = max - min,
      h, s, l;

  if (max == min)
    h = 0;
  else if (r == max) 
    h = (g - b) / delta; 
  else if (g == max)
    h = 2 + (b - r) / delta; 
  else if (b == max)
    h = 4 + (r - g)/ delta;

  h = Math.min(h * 60, 360);

  if (h < 0)
    h += 360;

  l = (min + max) / 2;

  if (max == min)
    s = 0;
  else if (l <= 0.5)
    s = delta / (max + min);
  else
    s = delta / (2 - max - min);

  return [h, s * 100, l * 100];
}

function rgb2hsv(rgb) {
  var r = rgb[0],
      g = rgb[1],
      b = rgb[2],
      min = Math.min(r, g, b),
      max = Math.max(r, g, b),
      delta = max - min,
      h, s, v;

  if (max == 0)
    s = 0;
  else
    s = (delta/max * 1000)/10;

  if (max == min)
    h = 0;
  else if (r == max) 
    h = (g - b) / delta; 
  else if (g == max)
    h = 2 + (b - r) / delta; 
  else if (b == max)
    h = 4 + (r - g) / delta;

  h = Math.min(h * 60, 360);

  if (h < 0) 
    h += 360;

  v = ((max / 255) * 1000) / 10;

  return [h, s, v];
}

function rgb2cmyk(rgb) {
  var r = rgb[0] / 255,
      g = rgb[1] / 255,
      b = rgb[2] / 255,
      c, m, y, k;
      
  k = Math.min(1 - r, 1 - g, 1 - b);
  c = (1 - r - k) / (1 - k);
  m = (1 - g - k) / (1 - k);
  y = (1 - b - k) / (1 - k);
  return [c * 100, m * 100, y * 100, k * 100];
}

function rgb2keyword(rgb) {
  return reverseKeywords[JSON.stringify(rgb)];
}

function rgb2xyz(rgb) {
  var r = rgb[0] / 255,
      g = rgb[1] / 255,
      b = rgb[2] / 255;

  // assume sRGB
  r = r > 0.04045 ? Math.pow(((r + 0.055) / 1.055), 2.4) : (r / 12.92);
  g = g > 0.04045 ? Math.pow(((g + 0.055) / 1.055), 2.4) : (g / 12.92);
  b = b > 0.04045 ? Math.pow(((b + 0.055) / 1.055), 2.4) : (b / 12.92);
  
  var x = (r * 0.4124) + (g * 0.3576) + (b * 0.1805);
  var y = (r * 0.2126) + (g * 0.7152) + (b * 0.0722);
  var z = (r * 0.0193) + (g * 0.1192) + (b * 0.9505);

  return [x * 100, y *100, z * 100];
}

function rgb2lab(rgb) {
  var xyz = rgb2xyz(rgb),
        x = xyz[0],
        y = xyz[1],
        z = xyz[2],
        l, a, b;

  x /= 95.047;
  y /= 100;
  z /= 108.883;

  x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + (16 / 116);
  y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + (16 / 116);
  z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + (16 / 116);

  l = (116 * y) - 16;
  a = 500 * (x - y);
  b = 200 * (y - z);
  
  return [l, a, b];
}


function hsl2rgb(hsl) {
  var h = hsl[0] / 360,
      s = hsl[1] / 100,
      l = hsl[2] / 100,
      t1, t2, t3, rgb, val;

  if (s == 0) {
    val = l * 255;
    return [val, val, val];
  }

  if (l < 0.5)
    t2 = l * (1 + s);
  else
    t2 = l + s - l * s;
  t1 = 2 * l - t2;

  rgb = [0, 0, 0];
  for (var i = 0; i < 3; i++) {
    t3 = h + 1 / 3 * - (i - 1);
    t3 < 0 && t3++;
    t3 > 1 && t3--;

    if (6 * t3 < 1)
      val = t1 + (t2 - t1) * 6 * t3;
    else if (2 * t3 < 1)
      val = t2;
    else if (3 * t3 < 2)
      val = t1 + (t2 - t1) * (2 / 3 - t3) * 6;
    else
      val = t1;

    rgb[i] = val * 255;
  }
  
  return rgb;
}

function hsl2hsv(hsl) {
  var h = hsl[0],
      s = hsl[1] / 100,
      l = hsl[2] / 100,
      sv, v;
  l *= 2;
  s *= (l <= 1) ? l : 2 - l;
  v = (l + s) / 2;
  sv = (2 * s) / (l + s);
  return [h, s * 100, v * 100];
}

function hsl2cmyk(args) {
  return rgb2cmyk(hsl2rgb(args));
}

function hsl2keyword(args) {
  return rgb2keyword(hsl2rgb(args));
}


function hsv2rgb(hsv) {
  var h = hsv[0] / 60,
      s = hsv[1] / 100,
      v = hsv[2] / 100,
      hi = Math.floor(h) % 6;

  var f = h - Math.floor(h),
      p = 255 * v * (1 - s),
      q = 255 * v * (1 - (s * f)),
      t = 255 * v * (1 - (s * (1 - f))),
      v = 255 * v;

  switch(hi) {
    case 0:
      return [v, t, p];
    case 1:
      return [q, v, p];
    case 2:
      return [p, v, t];
    case 3:
      return [p, q, v];
    case 4:
      return [t, p, v];
    case 5:
      return [v, p, q];
  }
}

function hsv2hsl(hsv) {
  var h = hsv[0],
      s = hsv[1] / 100,
      v = hsv[2] / 100,
      sl, l;

  l = (2 - s) * v;  
  sl = s * v;
  sl /= (l <= 1) ? l : 2 - l;
  l /= 2;
  return [h, sl * 100, l * 100];
}

function hsv2cmyk(args) {
  return rgb2cmyk(hsv2rgb(args));
}

function hsv2keyword(args) {
  return rgb2keyword(hsv2rgb(args));
}

function cmyk2rgb(cmyk) {
  var c = cmyk[0] / 100,
      m = cmyk[1] / 100,
      y = cmyk[2] / 100,
      k = cmyk[3] / 100,
      r, g, b;

  r = 1 - Math.min(1, c * (1 - k) + k);
  g = 1 - Math.min(1, m * (1 - k) + k);
  b = 1 - Math.min(1, y * (1 - k) + k);
  return [r * 255, g * 255, b * 255];
}

function cmyk2hsl(args) {
  return rgb2hsl(cmyk2rgb(args));
}

function cmyk2hsv(args) {
  return rgb2hsv(cmyk2rgb(args));
}

function cmyk2keyword(args) {
  return rgb2keyword(cmyk2rgb(args));
}


function xyz2rgb(xyz) {
  var x = xyz[0] / 100,
      y = xyz[1] / 100,
      z = xyz[2] / 100,
      r, g, b;

  r = (x * 3.2406) + (y * -1.5372) + (z * -0.4986);
  g = (x * -0.9689) + (y * 1.8758) + (z * 0.0415);
  b = (x * 0.0557) + (y * -0.2040) + (z * 1.0570);

  // assume sRGB
  r = r > 0.0031308 ? ((1.055 * Math.pow(r, 1.0 / 2.4)) - 0.055)
    : r = (r * 12.92);

  g = g > 0.0031308 ? ((1.055 * Math.pow(g, 1.0 / 2.4)) - 0.055)
    : g = (g * 12.92);
        
  b = b > 0.0031308 ? ((1.055 * Math.pow(b, 1.0 / 2.4)) - 0.055)
    : b = (b * 12.92);

  r = (r < 0) ? 0 : r;
  g = (g < 0) ? 0 : g;
  b = (b < 0) ? 0 : b;

  return [r * 255, g * 255, b * 255];
}


function keyword2rgb(keyword) {
  return cssKeywords[keyword];
}

function keyword2hsl(args) {
  return rgb2hsl(keyword2rgb(args));
}

function keyword2hsv(args) {
  return rgb2hsv(keyword2rgb(args));
}

function keyword2cmyk(args) {
  return rgb2cmyk(keyword2rgb(args));
}

var cssKeywords = {
  aliceblue:  [240,248,255],
  antiquewhite: [250,235,215],
  aqua: [0,255,255],
  aquamarine: [127,255,212],
  azure:  [240,255,255],
  beige:  [245,245,220],
  bisque: [255,228,196],
  black:  [0,0,0],
  blanchedalmond: [255,235,205],
  blue: [0,0,255],
  blueviolet: [138,43,226],
  brown:  [165,42,42],
  burlywood:  [222,184,135],
  cadetblue:  [95,158,160],
  chartreuse: [127,255,0],
  chocolate:  [210,105,30],
  coral:  [255,127,80],
  cornflowerblue: [100,149,237],
  cornsilk: [255,248,220],
  crimson:  [220,20,60],
  cyan: [0,255,255],
  darkblue: [0,0,139],
  darkcyan: [0,139,139],
  darkgoldenrod:  [184,134,11],
  darkgray: [169,169,169],
  darkgreen:  [0,100,0],
  darkgrey: [169,169,169],
  darkkhaki:  [189,183,107],
  darkmagenta:  [139,0,139],
  darkolivegreen: [85,107,47],
  darkorange: [255,140,0],
  darkorchid: [153,50,204],
  darkred:  [139,0,0],
  darksalmon: [233,150,122],
  darkseagreen: [143,188,143],
  darkslateblue:  [72,61,139],
  darkslategray:  [47,79,79],
  darkslategrey:  [47,79,79],
  darkturquoise:  [0,206,209],
  darkviolet: [148,0,211],
  deeppink: [255,20,147],
  deepskyblue:  [0,191,255],
  dimgray:  [105,105,105],
  dimgrey:  [105,105,105],
  dodgerblue: [30,144,255],
  firebrick:  [178,34,34],
  floralwhite:  [255,250,240],
  forestgreen:  [34,139,34],
  fuchsia:  [255,0,255],
  gainsboro:  [220,220,220],
  ghostwhite: [248,248,255],
  gold: [255,215,0],
  goldenrod:  [218,165,32],
  gray: [128,128,128],
  green:  [0,128,0],
  greenyellow:  [173,255,47],
  grey: [128,128,128],
  honeydew: [240,255,240],
  hotpink:  [255,105,180],
  indianred:  [205,92,92],
  indigo: [75,0,130],
  ivory:  [255,255,240],
  khaki:  [240,230,140],
  lavender: [230,230,250],
  lavenderblush:  [255,240,245],
  lawngreen:  [124,252,0],
  lemonchiffon: [255,250,205],
  lightblue:  [173,216,230],
  lightcoral: [240,128,128],
  lightcyan:  [224,255,255],
  lightgoldenrodyellow: [250,250,210],
  lightgray:  [211,211,211],
  lightgreen: [144,238,144],
  lightgrey:  [211,211,211],
  lightpink:  [255,182,193],
  lightsalmon:  [255,160,122],
  lightseagreen:  [32,178,170],
  lightskyblue: [135,206,250],
  lightslategray: [119,136,153],
  lightslategrey: [119,136,153],
  lightsteelblue: [176,196,222],
  lightyellow:  [255,255,224],
  lime: [0,255,0],
  limegreen:  [50,205,50],
  linen:  [250,240,230],
  magenta:  [255,0,255],
  maroon: [128,0,0],
  mediumaquamarine: [102,205,170],
  mediumblue: [0,0,205],
  mediumorchid: [186,85,211],
  mediumpurple: [147,112,219],
  mediumseagreen: [60,179,113],
  mediumslateblue:  [123,104,238],
  mediumspringgreen:  [0,250,154],
  mediumturquoise:  [72,209,204],
  mediumvioletred:  [199,21,133],
  midnightblue: [25,25,112],
  mintcream:  [245,255,250],
  mistyrose:  [255,228,225],
  moccasin: [255,228,181],
  navajowhite:  [255,222,173],
  navy: [0,0,128],
  oldlace:  [253,245,230],
  olive:  [128,128,0],
  olivedrab:  [107,142,35],
  orange: [255,165,0],
  orangered:  [255,69,0],
  orchid: [218,112,214],
  palegoldenrod:  [238,232,170],
  palegreen:  [152,251,152],
  paleturquoise:  [175,238,238],
  palevioletred:  [219,112,147],
  papayawhip: [255,239,213],
  peachpuff:  [255,218,185],
  peru: [205,133,63],
  pink: [255,192,203],
  plum: [221,160,221],
  powderblue: [176,224,230],
  purple: [128,0,128],
  red:  [255,0,0],
  rosybrown:  [188,143,143],
  royalblue:  [65,105,225],
  saddlebrown:  [139,69,19],
  salmon: [250,128,114],
  sandybrown: [244,164,96],
  seagreen: [46,139,87],
  seashell: [255,245,238],
  sienna: [160,82,45],
  silver: [192,192,192],
  skyblue:  [135,206,235],
  slateblue:  [106,90,205],
  slategray:  [112,128,144],
  slategrey:  [112,128,144],
  snow: [255,250,250],
  springgreen:  [0,255,127],
  steelblue:  [70,130,180],
  tan:  [210,180,140],
  teal: [0,128,128],
  thistle:  [216,191,216],
  tomato: [255,99,71],
  turquoise:  [64,224,208],
  violet: [238,130,238],
  wheat:  [245,222,179],
  white:  [255,255,255],
  whitesmoke: [245,245,245],
  yellow: [255,255,0],
  yellowgreen:  [154,205,50]
};

var reverseKeywords = {};
for (var key in cssKeywords) {
  reverseKeywords[JSON.stringify(cssKeywords[key])] = key;
}

},{}],10:[function(require,module,exports){
var conversions = require("./conversions");

var exports = {};
module.exports = exports;

for (var func in conversions) {
  // export rgb2hslRaw
  exports[func + "Raw"] =  (function(func) {
    // accept array or plain args
    return function(arg) {
      if (typeof arg == "number")
        arg = Array.prototype.slice.call(arguments);
      return conversions[func](arg);
    }
  })(func);

  var pair = /(\w+)2(\w+)/.exec(func),
      from = pair[1],
      to = pair[2];

  // export rgb2hsl and ["rgb"]["hsl"]
  exports[from] = exports[from] || {};

  exports[from][to] = exports[func] = (function(func) { 
    return function(arg) {
      if (typeof arg == "number")
        arg = Array.prototype.slice.call(arguments);
      
      var val = conversions[func](arg);
      if (typeof val == "string" || val === undefined)
        return val; // keyword

      for (var i = 0; i < val.length; i++)
        val[i] = Math.round(val[i]);
      return val;
    }
  })(func);
}
},{"./conversions":9}],11:[function(require,module,exports){
/* MIT license */
var convert = require("color-convert"),
    string = require("color-string");

module.exports = function(cssString) {
   return new Color(cssString);
};

var Color = function(cssString) {
   this.values = {
      rgb: [0, 0, 0],
      hsl: [0, 0, 0],
      hsv: [0, 0, 0],
      cmyk: [0, 0, 0, 0],
      alpha: 1
   }

   // parse Color() argument
   if (typeof cssString == "string") {
      var vals = string.getRgba(cssString);
      if (vals) {
         this.setValues("rgb", vals);
      }
      else if(vals = string.getHsla(cssString)) {
         this.setValues("hsl", vals);
      }
   }
   else if (typeof cssString == "object") {
      var vals = cssString;
      if(vals["r"] !== undefined || vals["red"] !== undefined) {
         this.setValues("rgb", vals)
      }
      else if(vals["l"] !== undefined || vals["lightness"] !== undefined) {
         this.setValues("hsl", vals)
      }
      else if(vals["v"] !== undefined || vals["value"] !== undefined) {
         this.setValues("hsv", vals)
      }
      else if(vals["c"] !== undefined || vals["cyan"] !== undefined) {
         this.setValues("cmyk", vals)
      }
   }
}

Color.prototype = {
   rgb: function (vals) {
      return this.setSpace("rgb", arguments);
   },
   hsl: function(vals) {
      return this.setSpace("hsl", arguments);
   },
   hsv: function(vals) {
      return this.setSpace("hsv", arguments);
   },
   cmyk: function(vals) {
      return this.setSpace("cmyk", arguments);
   },

   rgbArray: function() {
      return this.values.rgb;
   },
   hslArray: function() {
      return this.values.hsl;
   },
   hsvArray: function() {
      return this.values.hsv;
   },
   cmykArray: function() {
      return this.values.cmyk;
   },
   rgbaArray: function() {
      var rgb = this.values.rgb;
      return rgb.concat([this.values.alpha]);
   },
   hslaArray: function() {
      var hsl = this.values.hsl;
      return hsl.concat([this.values.alpha]);
   },

   alpha: function(val) {
      if (val === undefined) {
         return this.values.alpha;
      }
      this.setValues("alpha", val);
      return this;
   },

   red: function(val) {
      return this.setChannel("rgb", 0, val);
   },
   green: function(val) {
      return this.setChannel("rgb", 1, val);
   },
   blue: function(val) {
      return this.setChannel("rgb", 2, val);
   },
   hue: function(val) {
      return this.setChannel("hsl", 0, val);
   },
   saturation: function(val) {
      return this.setChannel("hsl", 1, val);
   },
   lightness: function(val) {
      return this.setChannel("hsl", 2, val);
   },
   saturationv: function(val) {
      return this.setChannel("hsv", 1, val);
   },
   value: function(val) {
      return this.setChannel("hsv", 2, val);
   },
   cyan: function(val) {
      return this.setChannel("cmyk", 0, val);
   },
   magenta: function(val) {
      return this.setChannel("cmyk", 1, val);
   },
   yellow: function(val) {
      return this.setChannel("cmyk", 2, val);
   },
   black: function(val) {
      return this.setChannel("cmyk", 3, val);
   },

   hexString: function() {
      return string.hexString(this.values.rgb);
   },
   rgbString: function() {
      return string.rgbString(this.values.rgb, this.values.alpha);
   },
   rgbaString: function() {
      return string.rgbaString(this.values.rgb, this.values.alpha);
   },
   percentString: function() {
      return string.percentString(this.values.rgb, this.values.alpha);
   },
   hslString: function() {
      return string.hslString(this.values.hsl, this.values.alpha);
   },
   hslaString: function() {
      return string.hslaString(this.values.hsl, this.values.alpha);
   },
   keyword: function() {
      return string.keyword(this.values.rgb, this.values.alpha);
   },

   luminosity: function() {
      // http://www.w3.org/TR/WCAG20/#relativeluminancedef
      var rgb = this.values.rgb;
      var lum = [];
      for (var i = 0; i < rgb.length; i++) {
         var chan = rgb[i] / 255;
         lum[i] = (chan <= 0.03928) ? chan / 12.92
                  : Math.pow(((chan + 0.055) / 1.055), 2.4)
      }
      return 0.2126 * lum[0] + 0.7152 * lum[1] + 0.0722 * lum[2];
   },

   contrast: function(color2) {
      // http://www.w3.org/TR/WCAG20/#contrast-ratiodef
      var lum1 = this.luminosity();
      var lum2 = color2.luminosity();
      if (lum1 > lum2) {
         return (lum1 + 0.05) / (lum2 + 0.05)
      };
      return (lum2 + 0.05) / (lum1 + 0.05);
   },

   level: function(color2) {
     var contrastRatio = this.contrast(color2);
     return (contrastRatio >= 7.1)
       ? 'AAA'
       : (contrastRatio >= 4.5)
        ? 'AA'
        : '';
   },

   dark: function() {
      // YIQ equation from http://24ways.org/2010/calculating-color-contrast
      var rgb = this.values.rgb,
          yiq = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
   	return yiq < 128;
   },

   light: function() {
      return !this.dark();
   },

   negate: function() {
      var rgb = []
      for (var i = 0; i < 3; i++) {
         rgb[i] = 255 - this.values.rgb[i];
      }
      this.setValues("rgb", rgb);
      return this;
   },

   lighten: function(ratio) {
      this.values.hsl[2] += this.values.hsl[2] * ratio;
      this.setValues("hsl", this.values.hsl);
      return this;
   },

   darken: function(ratio) {
      this.values.hsl[2] -= this.values.hsl[2] * ratio;
      this.setValues("hsl", this.values.hsl);
      return this;
   },

   saturate: function(ratio) {
      this.values.hsl[1] += this.values.hsl[1] * ratio;
      this.setValues("hsl", this.values.hsl);
      return this;
   },

   desaturate: function(ratio) {
      this.values.hsl[1] -= this.values.hsl[1] * ratio;
      this.setValues("hsl", this.values.hsl);
      return this;
   },

   greyscale: function() {
      var rgb = this.values.rgb;
      // http://en.wikipedia.org/wiki/Grayscale#Converting_color_to_grayscale
      var val = rgb[0] * 0.3 + rgb[1] * 0.59 + rgb[2] * 0.11;
      this.setValues("rgb", [val, val, val]);
      return this;
   },

   clearer: function(ratio) {
      this.setValues("alpha", this.values.alpha - (this.values.alpha * ratio));
      return this;
   },

   opaquer: function(ratio) {
      this.setValues("alpha", this.values.alpha + (this.values.alpha * ratio));
      return this;
   },

   rotate: function(degrees) {
      var hue = this.values.hsl[0];
      hue = (hue + degrees) % 360;
      hue = hue < 0 ? 360 + hue : hue;
      this.values.hsl[0] = hue;
      this.setValues("hsl", this.values.hsl);
      return this;
   },

   mix: function(color2, weight) {
      weight = 1 - (weight == null ? 0.5 : weight);

      // algorithm from Sass's mix(). Ratio of first color in mix is
      // determined by the alphas of both colors and the weight
      var t1 = weight * 2 - 1,
          d = this.alpha() - color2.alpha();

      var weight1 = (((t1 * d == -1) ? t1 : (t1 + d) / (1 + t1 * d)) + 1) / 2;
      var weight2 = 1 - weight1;

      var rgb = this.rgbArray();
      var rgb2 = color2.rgbArray();

      for (var i = 0; i < rgb.length; i++) {
         rgb[i] = rgb[i] * weight1 + rgb2[i] * weight2;
      }
      this.setValues("rgb", rgb);

      var alpha = this.alpha() * weight + color2.alpha() * (1 - weight);
      this.setValues("alpha", alpha);

      return this;
   },

   toJSON: function() {
     return this.rgb();
   },

   clone: function() {
     return new Color(this.rgb());
   },
}


Color.prototype.getValues = function(space) {
   var vals = {};
   for (var i = 0; i < space.length; i++) {
      vals[space[i]] = this.values[space][i];
   }
   if (this.values.alpha != 1) {
      vals["a"] = this.values.alpha;
   }
   // {r: 255, g: 255, b: 255, a: 0.4}
   return vals;
}

Color.prototype.setValues = function(space, vals) {
   var spaces = {
      "rgb": ["red", "green", "blue"],
      "hsl": ["hue", "saturation", "lightness"],
      "hsv": ["hue", "saturation", "value"],
      "cmyk": ["cyan", "magenta", "yellow", "black"]
   };

   var maxes = {
      "rgb": [255, 255, 255],
      "hsl": [360, 100, 100],
      "hsv": [360, 100, 100],
      "cmyk": [100, 100, 100, 100],
   };

   var alpha = 1;
   if (space == "alpha") {
      alpha = vals;
   }
   else if (vals.length) {
      // [10, 10, 10]
      this.values[space] = vals.slice(0, space.length);
      alpha = vals[space.length];
   }
   else if (vals[space[0]] !== undefined) {
      // {r: 10, g: 10, b: 10}
      for (var i = 0; i < space.length; i++) {
        this.values[space][i] = vals[space[i]];
      }
      alpha = vals.a;
   }
   else if (vals[spaces[space][0]] !== undefined) {
      // {red: 10, green: 10, blue: 10}
      var chans = spaces[space];
      for (var i = 0; i < space.length; i++) {
        this.values[space][i] = vals[chans[i]];
      }
      alpha = vals.alpha;
   }
   this.values.alpha = Math.max(0, Math.min(1, (alpha !== undefined ? alpha : this.values.alpha) ));
   if (space == "alpha") {
      return;
   }

   // convert to all the other color spaces
   for (var sname in spaces) {
      if (sname != space) {
         this.values[sname] = convert[space][sname](this.values[space])
      }

      // cap values
      for (var i = 0; i < sname.length; i++) {
         var capped = Math.max(0, Math.min(maxes[sname][i], this.values[sname][i]));
         this.values[sname][i] = Math.round(capped);
      }
   }
   return true;
}

Color.prototype.setSpace = function(space, args) {
   var vals = args[0];
   if (vals === undefined) {
      // color.rgb()
      return this.getValues(space);
   }
   // color.rgb(10, 10, 10)
   if (typeof vals == "number") {
      vals = Array.prototype.slice.call(args);
   }
   this.setValues(space, vals);
   return this;
}

Color.prototype.setChannel = function(space, index, val) {
   if (val === undefined) {
      // color.red()
      return this.values[space][index];
   }
   // color.red(100)
   this.values[space][index] = val;
   this.setValues(space, this.values[space]);
   return this;
}

},{"color-convert":13,"color-string":14}],12:[function(require,module,exports){
module.exports=require(9)
},{}],13:[function(require,module,exports){
module.exports=require(10)
},{"./conversions":12}],14:[function(require,module,exports){
module.exports=require(8)
},{"color-convert":16}],15:[function(require,module,exports){
module.exports=require(9)
},{}],16:[function(require,module,exports){
module.exports=require(10)
},{"./conversions":15}],17:[function(require,module,exports){
var color = require("color");
var string = require("color-string");

exports.min = function min(c) {

  if (Array.isArray(c)) {
    var colour = color({
      r: c[0],
      g: c[1],
      b: c[2],
    });
    if ('3' in c) {
      colour.alpha(c[3]);
    }
  } else {
    var colour = color(c);
  }
  var alpha = colour.values.alpha;
  var rgb = colour.values.rgb;

  if (rgb[0] === 0 && rgb[1] === 0 && rgb[2] === 0 && alpha === 0) {
    return 'transparent';
  }

  if (alpha !== 1) {
    // no choice, gotta be rgba
    if (alpha < 1) {
      alpha = String(alpha).replace('0.', '.');
    }
    return string
      .rgbaString(rgb, alpha)
      .replace(/ /g, '')
      .toLowerCase();
  }

  // hex, short hex, or keyword
  var hex = colour.hexString();
  if (hex[1] === hex[2] && hex[3] === hex[4] && hex[5] === hex[6]) {
    hex = ['#', hex[1], hex[3], hex[5]].join('');
  }
  var word = colour.keyword();
  if (!word || hex.length < word.length) {
    return hex.toLowerCase();
  }
  return word.toLowerCase();
};


// only key names that have shorter equivalents
// e.g. "red" and "blue" are not here
exports.keywords = {
  "aliceblue": "#f0f8ff",
  "antiquewhite": "#faebd7",
  "aquamarine": "#7fffd4",
  "black": "#000",
  "blanchedalmond": "#ffebcd",
  "blueviolet": "#8a2be2",
  "burlywood": "#deb887",
  "cadetblue": "#5f9ea0",
  "chartreuse": "#7fff00",
  "chocolate": "#d2691e",
  "cornflowerblue": "#6495ed",
  "cornsilk": "#fff8dc",
  "darkblue": "#00008b",
  "darkcyan": "#008b8b",
  "darkgoldenrod": "#b8860b",
  "darkgray": "#a9a9a9",
  "darkgreen": "#006400",
  "darkgrey": "#a9a9a9",
  "darkkhaki": "#bdb76b",
  "darkmagenta": "#8b008b",
  "darkolivegreen": "#556b2f",
  "darkorange": "#ff8c00",
  "darkorchid": "#9932cc",
  "darksalmon": "#e9967a",
  "darkseagreen": "#8fbc8f",
  "darkslateblue": "#483d8b",
  "darkslategray": "#2f4f4f",
  "darkslategrey": "#2f4f4f",
  "darkturquoise": "#00ced1",
  "darkviolet": "#9400d3",
  "deeppink": "#ff1493",
  "deepskyblue": "#00bfff",
  "dodgerblue": "#1e90ff",
  "firebrick": "#b22222",
  "floralwhite": "#fffaf0",
  "forestgreen": "#228b22",
  "fuchsia": "#f0f",
  "gainsboro": "#dcdcdc",
  "ghostwhite": "#f8f8ff",
  "goldenrod": "#daa520",
  "greenyellow": "#adff2f",
  "honeydew": "#f0fff0",
  "indianred": "#cd5c5c",
  "lavender": "#e6e6fa",
  "lavenderblush": "#fff0f5",
  "lawngreen": "#7cfc00",
  "lemonchiffon": "#fffacd",
  "lightblue": "#add8e6",
  "lightcoral": "#f08080",
  "lightcyan": "#e0ffff",
  "lightgoldenrodyellow": "#fafad2",
  "lightgray": "#d3d3d3",
  "lightgreen": "#90ee90",
  "lightgrey": "#d3d3d3",
  "lightpink": "#ffb6c1",
  "lightsalmon": "#ffa07a",
  "lightseagreen": "#20b2aa",
  "lightskyblue": "#87cefa",
  "lightslategray": "#789",
  "lightslategrey": "#789",
  "lightsteelblue": "#b0c4de",
  "lightyellow": "#ffffe0",
  "limegreen": "#32cd32",
  "magenta": "#f0f",
  "mediumaquamarine": "#66cdaa",
  "mediumblue": "#0000cd",
  "mediumorchid": "#ba55d3",
  "mediumpurple": "#9370db",
  "mediumseagreen": "#3cb371",
  "mediumslateblue": "#7b68ee",
  "mediumspringgreen": "#00fa9a",
  "mediumturquoise": "#48d1cc",
  "mediumvioletred": "#c71585",
  "midnightblue": "#191970",
  "mintcream": "#f5fffa",
  "mistyrose": "#ffe4e1",
  "moccasin": "#ffe4b5",
  "navajowhite": "#ffdead",
  "olivedrab": "#6b8e23",
  "orangered": "#ff4500",
  "palegoldenrod": "#eee8aa",
  "palegreen": "#98fb98",
  "paleturquoise": "#afeeee",
  "palevioletred": "#db7093",
  "papayawhip": "#ffefd5",
  "peachpuff": "#ffdab9",
  "powderblue": "#b0e0e6",
  "rosybrown": "#bc8f8f",
  "royalblue": "#4169e1",
  "saddlebrown": "#8b4513",
  "sandybrown": "#f4a460",
  "seagreen": "#2e8b57",
  "seashell": "#fff5ee",
  "slateblue": "#6a5acd",
  "slategray": "#708090",
  "slategrey": "#708090",
  "springgreen": "#00ff7f",
  "steelblue": "#4682b4",
  "turquoise": "#40e0d0",
  "white": "#fff",
  "whitesmoke": "#f5f5f5",
  "yellow": "#ff0",
  "yellowgreen": "#9acd32"
};


},{"color":11,"color-string":8}],18:[function(require,module,exports){
module.exports = [
  "align-content",
  "align-items",
  "align-self",
  "alignment-baseline",
  "animation",
  "animation-delay",
  "animation-direction",
  "animation-duration",
  "animation-fill-mode",
  "animation-iteration-count",
  "animation-name",
  "animation-play-state",
  "animation-timing-function",
  "app-region",
  "appearance",
  "aspect-ratio",
  "backface-visibility",
  "background",
  "background-attachment",
  "background-blend-mode",
  "background-clip",
  "background-color",
  "background-composite",
  "background-image",
  "background-origin",
  "background-position",
  "background-position-x",
  "background-position-y",
  "background-repeat",
  "background-repeat-x",
  "background-repeat-y",
  "background-size",
  "baseline-shift",
  "border",
  "border-after",
  "border-after-color",
  "border-after-style",
  "border-after-width",
  "border-before",
  "border-before-color",
  "border-before-style",
  "border-before-width",
  "border-bottom",
  "border-bottom-color",
  "border-bottom-left-radius",
  "border-bottom-right-radius",
  "border-bottom-style",
  "border-bottom-width",
  "border-collapse",
  "border-color",
  "border-end",
  "border-end-color",
  "border-end-style",
  "border-end-width",
  "border-fit",
  "border-horizontal-spacing",
  "border-image",
  "border-image-outset",
  "border-image-repeat",
  "border-image-slice",
  "border-image-source",
  "border-image-width",
  "border-left",
  "border-left-color",
  "border-left-style",
  "border-left-width",
  "border-radius",
  "border-right",
  "border-right-color",
  "border-right-style",
  "border-right-width",
  "border-spacing",
  "border-start",
  "border-start-color",
  "border-start-style",
  "border-start-width",
  "border-style",
  "border-top",
  "border-top-color",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-top-style",
  "border-top-width",
  "border-vertical-spacing",
  "border-width",
  "bottom",
  "box-align",
  "box-decoration-break",
  "box-direction",
  "box-flex",
  "box-flex-group",
  "box-lines",
  "box-ordinal-group",
  "box-orient",
  "box-pack",
  "box-reflect",
  "box-shadow",
  "box-sizing",
  "buffered-rendering",
  "caption-side",
  "clear",
  "clip",
  "clip-path",
  "clip-rule",
  "color",
  "color-interpolation",
  "color-interpolation-filters",
  "color-profile",
  "color-rendering",
  "column-break-after",
  "column-break-before",
  "column-break-inside",
  "column-count",
  "column-gap",
  "column-rule",
  "column-rule-color",
  "column-rule-style",
  "column-rule-width",
  "column-span",
  "column-width",
  "columns",
  "content",
  "counter-increment",
  "counter-reset",
  "cursor",
  "direction",
  "display",
  "dominant-baseline",
  "empty-cells",
  "enable-background",
  "fill",
  "fill-opacity",
  "fill-rule",
  "filter",
  "flex",
  "flex-basis",
  "flex-direction",
  "flex-flow",
  "flex-grow",
  "flex-shrink",
  "flex-wrap",
  "float",
  "flood-color",
  "flood-opacity",
  "font",
  "font-family",
  "font-feature-settings",
  "font-kerning",
  "font-size",
  "font-size-delta",
  "font-smoothing",
  "font-stretch",
  "font-style",
  "font-variant",
  "font-variant-ligatures",
  "font-weight",
  "glyph-orientation-horizontal",
  "glyph-orientation-vertical",
  "height",
  "highlight",
  "hyphenate-character",
  "image-rendering",
  "justify-content",
  "kerning",
  "left",
  "letter-spacing",
  "lighting-color",
  "line-box-contain",
  "line-break",
  "line-clamp",
  "line-height",
  "list-style",
  "list-style-image",
  "list-style-position",
  "list-style-type",
  "locale",
  "logical-height",
  "logical-width",
  "margin",
  "margin-after",
  "margin-after-collapse",
  "margin-before",
  "margin-before-collapse",
  "margin-bottom",
  "margin-bottom-collapse",
  "margin-collapse",
  "margin-end",
  "margin-left",
  "margin-right",
  "margin-start",
  "margin-top",
  "margin-top-collapse",
  "marker",
  "marker-end",
  "marker-mid",
  "marker-start",
  "mask",
  "mask-box-image",
  "mask-box-image-outset",
  "mask-box-image-repeat",
  "mask-box-image-slice",
  "mask-box-image-source",
  "mask-box-image-width",
  "mask-clip",
  "mask-composite",
  "mask-image",
  "mask-origin",
  "mask-position",
  "mask-position-x",
  "mask-position-y",
  "mask-repeat",
  "mask-repeat-x",
  "mask-repeat-y",
  "mask-size",
  "mask-type",
  "max-height",
  "max-logical-height",
  "max-logical-width",
  "max-width",
  "max-zoom",
  "min-height",
  "min-logical-height",
  "min-logical-width",
  "min-width",
  "min-zoom",
  "object-fit",
  "object-position",
  "opacity",
  "order",
  "orientation",
  "orphans",
  "outline",
  "outline-color",
  "outline-offset",
  "outline-style",
  "outline-width",
  "overflow",
  "overflow-wrap",
  "overflow-x",
  "overflow-y",
  "padding",
  "padding-after",
  "padding-before",
  "padding-bottom",
  "padding-end",
  "padding-left",
  "padding-right",
  "padding-start",
  "padding-top",
  "page",
  "page-break-after",
  "page-break-before",
  "page-break-inside",
  "paint-order",
  "perspective",
  "perspective-origin",
  "perspective-origin-x",
  "perspective-origin-y",
  "pointer-events",
  "position",
  "print-color-adjust",
  "quotes",
  "resize",
  "right",
  "rtl-ordering",
  "ruby-position",
  "shape-rendering",
  "size",
  "speak",
  "src",
  "stop-color",
  "stop-opacity",
  "stroke",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-opacity",
  "stroke-width",
  "tab-size",
  "table-layout",
  "tap-highlight-color",
  "text-align",
  "text-anchor",
  "text-combine",
  "text-decoration",
  "text-decorations-in-effect",
  "text-emphasis",
  "text-emphasis-color",
  "text-emphasis-position",
  "text-emphasis-style",
  "text-fill-color",
  "text-indent",
  "text-line-through-color",
  "text-line-through-mode",
  "text-line-through-style",
  "text-line-through-width",
  "text-orientation",
  "text-overflow",
  "text-overline-color",
  "text-overline-mode",
  "text-overline-style",
  "text-overline-width",
  "text-rendering",
  "text-security",
  "text-shadow",
  "text-stroke",
  "text-stroke-color",
  "text-stroke-width",
  "text-transform",
  "text-underline-color",
  "text-underline-mode",
  "text-underline-style",
  "text-underline-width",
  "top",
  "touch-action",
  "transform",
  "transform-origin",
  "transform-origin-x",
  "transform-origin-y",
  "transform-origin-z",
  "transform-style",
  "transition",
  "transition-delay",
  "transition-duration",
  "transition-property",
  "transition-timing-function",
  "unicode-bidi",
  "unicode-range",
  "user-drag",
  "user-modify",
  "user-select",
  "user-zoom",
  "vector-effect",
  "vertical-align",
  "visibility",
  "white-space",
  "widows",
  "width",
  "word-break",
  "word-spacing",
  "word-wrap",
  "writing-mode",
  "z-index",
  "zoom"
];
},{}],19:[function(require,module,exports){
module.exports = [
  "align-content",
  "align-items",
  "align-self",
  "all",
  "animation",
  "animation-delay",
  "animation-direction",
  "animation-duration",
  "animation-fill-mode",
  "animation-iteration-count",
  "animation-name",
  "animation-play-state",
  "animation-timing-function",
  "appearance",
  "backface-visibility",
  "background",
  "background-attachment",
  "background-blend-mode",
  "background-clip",
  "background-color",
  "background-image",
  "background-origin",
  "background-position",
  "background-repeat",
  "background-size",
  "binding",
  "border",
  "border-bottom",
  "border-bottom-color",
  "border-bottom-colors",
  "border-bottom-left-radius",
  "border-bottom-right-radius",
  "border-bottom-style",
  "border-bottom-width",
  "border-collapse",
  "border-color",
  "border-end",
  "border-end-color",
  "border-end-style",
  "border-end-width",
  "border-image",
  "border-image-outset",
  "border-image-repeat",
  "border-image-slice",
  "border-image-source",
  "border-image-width",
  "border-left",
  "border-left-color",
  "border-left-colors",
  "border-left-style",
  "border-left-width",
  "border-radius",
  "border-right",
  "border-right-color",
  "border-right-colors",
  "border-right-style",
  "border-right-width",
  "border-spacing",
  "border-start",
  "border-start-color",
  "border-start-style",
  "border-start-width",
  "border-style",
  "border-top",
  "border-top-color",
  "border-top-colors",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-top-style",
  "border-top-width",
  "border-width",
  "bottom",
  "box-align",
  "box-direction",
  "box-flex",
  "box-ordinal-group",
  "box-orient",
  "box-pack",
  "box-shadow",
  "box-sizing",
  "caption-side",
  "clear",
  "clip",
  "clip-path",
  "clip-rule",
  "color",
  "color-interpolation",
  "color-interpolation-filters",
  "column-count",
  "column-fill",
  "column-gap",
  "column-rule",
  "column-rule-color",
  "column-rule-style",
  "column-rule-width",
  "column-width",
  "columns",
  "content",
  "counter-increment",
  "counter-reset",
  "cursor",
  "direction",
  "display",
  "dominant-baseline",
  "empty-cells",
  "fill",
  "fill-opacity",
  "fill-rule",
  "filter",
  "flex",
  "flex-basis",
  "flex-direction",
  "flex-flow",
  "flex-grow",
  "flex-shrink",
  "flex-wrap",
  "float-edge",
  "flood-color",
  "flood-opacity",
  "font",
  "font-family",
  "font-feature-settings",
  "font-kerning",
  "font-language-override",
  "font-size",
  "font-size-adjust",
  "font-stretch",
  "font-style",
  "font-synthesis",
  "font-variant",
  "font-variant-alternates",
  "font-variant-caps",
  "font-variant-east-asian",
  "font-variant-ligatures",
  "font-variant-numeric",
  "font-variant-position",
  "font-weight",
  "force-broken-image-icon",
  "height",
  "hyphens",
  "image-orientation",
  "image-region",
  "image-rendering",
  "ime-mode",
  "justify-content",
  "left",
  "letter-spacing",
  "lighting-color",
  "line-height",
  "list-style",
  "list-style-image",
  "list-style-position",
  "list-style-type",
  "margin",
  "margin-bottom",
  "margin-end",
  "margin-left",
  "margin-right",
  "margin-start",
  "margin-top",
  "marker",
  "marker-end",
  "marker-mid",
  "marker-offset",
  "marker-start",
  "marks",
  "mask",
  "mask-type",
  "max-height",
  "max-width",
  "min-height",
  "min-width",
  "mix-blend-mode",
  "opacity",
  "order",
  "orient",
  "orphans",
  "osx-font-smoothing",
  "outline",
  "outline-color",
  "outline-offset",
  "outline-radius",
  "outline-radius-bottomleft",
  "outline-radius-bottomright",
  "outline-radius-topleft",
  "outline-radius-topright",
  "outline-style",
  "outline-width",
  "overflow",
  "overflow-x",
  "overflow-y",
  "padding",
  "padding-bottom",
  "padding-end",
  "padding-left",
  "padding-right",
  "padding-start",
  "padding-top",
  "page",
  "page-break-after",
  "page-break-before",
  "page-break-inside",
  "paint-order",
  "perspective",
  "perspective-origin",
  "pointer-events",
  "position",
  "quotes",
  "resize",
  "right",
  "shape-rendering",
  "size",
  "stack-sizing",
  "stop-color",
  "stop-opacity",
  "stroke",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-opacity",
  "stroke-width",
  "tab-size",
  "table-layout",
  "text-align",
  "text-align-last",
  "text-anchor",
  "text-decoration",
  "text-decoration-color",
  "text-decoration-line",
  "text-decoration-style",
  "text-indent",
  "text-overflow",
  "text-rendering",
  "text-shadow",
  "text-size-adjust",
  "text-transform",
  "top",
  "transform",
  "transform-origin",
  "transform-style",
  "transition",
  "transition-delay",
  "transition-duration",
  "transition-property",
  "transition-timing-function",
  "unicode-bidi",
  "user-focus",
  "user-input",
  "user-modify",
  "user-select",
  "vector-effect",
  "vertical-align",
  "visibility",
  "white-space",
  "widows",
  "width",
  "window-shadow",
  "word-break",
  "word-spacing",
  "word-wrap",
  "z-index"
];
},{}],20:[function(require,module,exports){
module.exports = [
  "align-content",
  "align-items",
  "align-self",
  "alignment-baseline",
  "animation",
  "animation-delay",
  "animation-direction",
  "animation-duration",
  "animation-fill-mode",
  "animation-iteration-count",
  "animation-name",
  "animation-play-state",
  "animation-timing-function",
  "app-region",
  "appearance",
  "aspect-ratio",
  "backface-visibility",
  "background",
  "background-attachment",
  "background-blend-mode",
  "background-clip",
  "background-color",
  "background-composite",
  "background-image",
  "background-origin",
  "background-position",
  "background-position-x",
  "background-position-y",
  "background-repeat",
  "background-repeat-x",
  "background-repeat-y",
  "background-size",
  "baseline-shift",
  "border",
  "border-after",
  "border-after-color",
  "border-after-style",
  "border-after-width",
  "border-before",
  "border-before-color",
  "border-before-style",
  "border-before-width",
  "border-bottom",
  "border-bottom-color",
  "border-bottom-left-radius",
  "border-bottom-right-radius",
  "border-bottom-style",
  "border-bottom-width",
  "border-collapse",
  "border-color",
  "border-end",
  "border-end-color",
  "border-end-style",
  "border-end-width",
  "border-fit",
  "border-horizontal-spacing",
  "border-image",
  "border-image-outset",
  "border-image-repeat",
  "border-image-slice",
  "border-image-source",
  "border-image-width",
  "border-left",
  "border-left-color",
  "border-left-style",
  "border-left-width",
  "border-radius",
  "border-right",
  "border-right-color",
  "border-right-style",
  "border-right-width",
  "border-spacing",
  "border-start",
  "border-start-color",
  "border-start-style",
  "border-start-width",
  "border-style",
  "border-top",
  "border-top-color",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-top-style",
  "border-top-width",
  "border-vertical-spacing",
  "border-width",
  "bottom",
  "box-align",
  "box-decoration-break",
  "box-direction",
  "box-flex",
  "box-flex-group",
  "box-lines",
  "box-ordinal-group",
  "box-orient",
  "box-pack",
  "box-reflect",
  "box-shadow",
  "box-sizing",
  "buffered-rendering",
  "caption-side",
  "clear",
  "clip",
  "clip-path",
  "clip-rule",
  "color",
  "color-interpolation",
  "color-interpolation-filters",
  "color-profile",
  "color-rendering",
  "column-break-after",
  "column-break-before",
  "column-break-inside",
  "column-count",
  "column-gap",
  "column-rule",
  "column-rule-color",
  "column-rule-style",
  "column-rule-width",
  "column-span",
  "column-width",
  "columns",
  "content",
  "counter-increment",
  "counter-reset",
  "cursor",
  "direction",
  "display",
  "dominant-baseline",
  "empty-cells",
  "enable-background",
  "fill",
  "fill-opacity",
  "fill-rule",
  "filter",
  "flex",
  "flex-basis",
  "flex-direction",
  "flex-flow",
  "flex-grow",
  "flex-shrink",
  "flex-wrap",
  "float",
  "flood-color",
  "flood-opacity",
  "font",
  "font-family",
  "font-feature-settings",
  "font-kerning",
  "font-size",
  "font-size-delta",
  "font-smoothing",
  "font-stretch",
  "font-style",
  "font-variant",
  "font-variant-ligatures",
  "font-weight",
  "glyph-orientation-horizontal",
  "glyph-orientation-vertical",
  "height",
  "highlight",
  "hyphenate-character",
  "image-rendering",
  "justify-content",
  "kerning",
  "left",
  "letter-spacing",
  "lighting-color",
  "line-box-contain",
  "line-break",
  "line-clamp",
  "line-height",
  "list-style",
  "list-style-image",
  "list-style-position",
  "list-style-type",
  "locale",
  "logical-height",
  "logical-width",
  "margin",
  "margin-after",
  "margin-after-collapse",
  "margin-before",
  "margin-before-collapse",
  "margin-bottom",
  "margin-bottom-collapse",
  "margin-collapse",
  "margin-end",
  "margin-left",
  "margin-right",
  "margin-start",
  "margin-top",
  "margin-top-collapse",
  "marker",
  "marker-end",
  "marker-mid",
  "marker-start",
  "mask",
  "mask-box-image",
  "mask-box-image-outset",
  "mask-box-image-repeat",
  "mask-box-image-slice",
  "mask-box-image-source",
  "mask-box-image-width",
  "mask-clip",
  "mask-composite",
  "mask-image",
  "mask-origin",
  "mask-position",
  "mask-position-x",
  "mask-position-y",
  "mask-repeat",
  "mask-repeat-x",
  "mask-repeat-y",
  "mask-size",
  "mask-type",
  "max-height",
  "max-logical-height",
  "max-logical-width",
  "max-width",
  "max-zoom",
  "min-height",
  "min-logical-height",
  "min-logical-width",
  "min-width",
  "min-zoom",
  "object-fit",
  "object-position",
  "opacity",
  "order",
  "orientation",
  "orphans",
  "outline",
  "outline-color",
  "outline-offset",
  "outline-style",
  "outline-width",
  "overflow",
  "overflow-wrap",
  "overflow-x",
  "overflow-y",
  "padding",
  "padding-after",
  "padding-before",
  "padding-bottom",
  "padding-end",
  "padding-left",
  "padding-right",
  "padding-start",
  "padding-top",
  "page",
  "page-break-after",
  "page-break-before",
  "page-break-inside",
  "paint-order",
  "perspective",
  "perspective-origin",
  "perspective-origin-x",
  "perspective-origin-y",
  "pointer-events",
  "position",
  "print-color-adjust",
  "quotes",
  "resize",
  "right",
  "rtl-ordering",
  "ruby-position",
  "shape-rendering",
  "size",
  "speak",
  "src",
  "stop-color",
  "stop-opacity",
  "stroke",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-opacity",
  "stroke-width",
  "tab-size",
  "table-layout",
  "tap-highlight-color",
  "text-align",
  "text-anchor",
  "text-combine",
  "text-decoration",
  "text-decorations-in-effect",
  "text-emphasis",
  "text-emphasis-color",
  "text-emphasis-position",
  "text-emphasis-style",
  "text-fill-color",
  "text-indent",
  "text-line-through-color",
  "text-line-through-mode",
  "text-line-through-style",
  "text-line-through-width",
  "text-orientation",
  "text-overflow",
  "text-overline-color",
  "text-overline-mode",
  "text-overline-style",
  "text-overline-width",
  "text-rendering",
  "text-security",
  "text-shadow",
  "text-stroke",
  "text-stroke-color",
  "text-stroke-width",
  "text-transform",
  "text-underline-color",
  "text-underline-mode",
  "text-underline-style",
  "text-underline-width",
  "top",
  "touch-action",
  "transform",
  "transform-origin",
  "transform-origin-x",
  "transform-origin-y",
  "transform-origin-z",
  "transform-style",
  "transition",
  "transition-delay",
  "transition-duration",
  "transition-property",
  "transition-timing-function",
  "unicode-bidi",
  "unicode-range",
  "user-drag",
  "user-modify",
  "user-select",
  "user-zoom",
  "vector-effect",
  "vertical-align",
  "visibility",
  "white-space",
  "widows",
  "width",
  "word-break",
  "word-spacing",
  "word-wrap",
  "writing-mode",
  "z-index",
  "zoom",
  "all",
  "binding",
  "border-bottom-colors",
  "border-left-colors",
  "border-right-colors",
  "border-top-colors",
  "column-fill",
  "float-edge",
  "font-language-override",
  "font-size-adjust",
  "font-synthesis",
  "font-variant-alternates",
  "font-variant-caps",
  "font-variant-east-asian",
  "font-variant-numeric",
  "font-variant-position",
  "force-broken-image-icon",
  "hyphens",
  "image-orientation",
  "image-region",
  "ime-mode",
  "marker-offset",
  "marks",
  "mix-blend-mode",
  "orient",
  "osx-font-smoothing",
  "outline-radius",
  "outline-radius-bottomleft",
  "outline-radius-bottomright",
  "outline-radius-topleft",
  "outline-radius-topright",
  "stack-sizing",
  "text-align-last",
  "text-decoration-color",
  "text-decoration-line",
  "text-decoration-style",
  "text-size-adjust",
  "user-focus",
  "user-input",
  "window-shadow",
  "accelerator",
  "block-progression",
  "break-after",
  "break-before",
  "break-inside",
  "content-zoom-chaining",
  "content-zoom-limit",
  "content-zoom-limit-max",
  "content-zoom-limit-min",
  "content-zoom-snap",
  "content-zoom-snap-points",
  "content-zoom-snap-type",
  "content-zooming",
  "flex-align",
  "flex-item-align",
  "flex-line-pack",
  "flex-negative",
  "flex-order",
  "flex-pack",
  "flex-positive",
  "flex-preferred-size",
  "flow-from",
  "flow-into",
  "grid-column",
  "grid-column-align",
  "grid-column-span",
  "grid-columns",
  "grid-row",
  "grid-row-align",
  "grid-row-span",
  "grid-rows",
  "high-contrast-adjust",
  "hyphenate-limit-chars",
  "hyphenate-limit-lines",
  "hyphenate-limit-zone",
  "ime-align",
  "interpolation-mode",
  "layout-flow",
  "layout-grid",
  "layout-grid-char",
  "layout-grid-line",
  "layout-grid-mode",
  "layout-grid-type",
  "overflow-style",
  "ruby-align",
  "ruby-overhang",
  "scroll-chaining",
  "scroll-limit",
  "scroll-limit-x-max",
  "scroll-limit-x-min",
  "scroll-limit-y-max",
  "scroll-limit-y-min",
  "scroll-rails",
  "scroll-snap-points-x",
  "scroll-snap-points-y",
  "scroll-snap-type",
  "scroll-snap-x",
  "scroll-snap-y",
  "scroll-translation",
  "scrollbar-arrow-color",
  "scrollbar-base-color",
  "scrollbar-dark-shadow-color",
  "scrollbar-face-color",
  "scrollbar-highlight-color",
  "scrollbar-shadow-color",
  "scrollbar-track-color",
  "scrollbar3d-light-color",
  "style-float",
  "text-autospace",
  "text-combine-horizontal",
  "text-justify",
  "text-justify-trim",
  "text-kashida",
  "text-kashida-space",
  "text-underline-position",
  "touch-select",
  "wrap-flow",
  "wrap-margin",
  "wrap-through",
  "color-correction",
  "column-axis",
  "column-progression",
  "composition-fill-color",
  "composition-frame-color",
  "hyphenate-limit-after",
  "hyphenate-limit-before",
  "line-align",
  "line-grid",
  "line-snap",
  "marquee",
  "marquee-direction",
  "marquee-increment",
  "marquee-repetition",
  "marquee-speed",
  "marquee-style",
  "mask-attachment",
  "match-nearest-mail-blockquote-color",
  "nbsp-mode",
  "overflow-scrolling",
  "svg-shadow",
  "text-line-through",
  "text-overline",
  "text-underline",
  "touch-callout",
  "accesskey",
  "audio-level",
  "dashboard-region",
  "display-align",
  "input-format",
  "input-required",
  "line-increment",
  "link",
  "link-source",
  "marquee-dir",
  "marquee-loop",
  "nav-down",
  "nav-index",
  "nav-left",
  "nav-right",
  "nav-up",
  "scrollbar-darkshadow-color",
  "scrollbar3dlight-color",
  "solid-color",
  "solid-opacity",
  "table-baseline",
  "viewport-fill",
  "viewport-fill-opacity",
  "cursor-visibility",
  "grid-after",
  "grid-auto-columns",
  "grid-auto-flow",
  "grid-auto-rows",
  "grid-before",
  "grid-end",
  "grid-start",
  "region-break-after",
  "region-break-before",
  "region-break-inside",
  "region-fragment"
];
},{}],21:[function(require,module,exports){
module.exports = [
  "accelerator",
  "align-content",
  "align-items",
  "align-self",
  "alignment-baseline",
  "animation",
  "animation-delay",
  "animation-direction",
  "animation-duration",
  "animation-fill-mode",
  "animation-iteration-count",
  "animation-name",
  "animation-play-state",
  "animation-timing-function",
  "backface-visibility",
  "background",
  "background-attachment",
  "background-clip",
  "background-color",
  "background-image",
  "background-origin",
  "background-position",
  "background-position-x",
  "background-position-y",
  "background-repeat",
  "background-size",
  "baseline-shift",
  "block-progression",
  "border",
  "border-bottom",
  "border-bottom-color",
  "border-bottom-left-radius",
  "border-bottom-right-radius",
  "border-bottom-style",
  "border-bottom-width",
  "border-collapse",
  "border-color",
  "border-image",
  "border-image-outset",
  "border-image-repeat",
  "border-image-slice",
  "border-image-source",
  "border-image-width",
  "border-left",
  "border-left-color",
  "border-left-style",
  "border-left-width",
  "border-radius",
  "border-right",
  "border-right-color",
  "border-right-style",
  "border-right-width",
  "border-spacing",
  "border-style",
  "border-top",
  "border-top-color",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-top-style",
  "border-top-width",
  "border-width",
  "bottom",
  "box-shadow",
  "box-sizing",
  "break-after",
  "break-before",
  "break-inside",
  "caption-side",
  "clear",
  "clip",
  "clip-path",
  "clip-rule",
  "color",
  "color-interpolation-filters",
  "column-count",
  "column-fill",
  "column-gap",
  "column-rule",
  "column-rule-color",
  "column-rule-style",
  "column-rule-width",
  "column-span",
  "column-width",
  "columns",
  "content",
  "content-zoom-chaining",
  "content-zoom-limit",
  "content-zoom-limit-max",
  "content-zoom-limit-min",
  "content-zoom-snap",
  "content-zoom-snap-points",
  "content-zoom-snap-type",
  "content-zooming",
  "counter-increment",
  "counter-reset",
  "cursor",
  "direction",
  "display",
  "dominant-baseline",
  "empty-cells",
  "enable-background",
  "fill",
  "fill-opacity",
  "fill-rule",
  "filter",
  "flex",
  "flex-align",
  "flex-basis",
  "flex-direction",
  "flex-flow",
  "flex-grow",
  "flex-item-align",
  "flex-line-pack",
  "flex-negative",
  "flex-order",
  "flex-pack",
  "flex-positive",
  "flex-preferred-size",
  "flex-shrink",
  "flex-wrap",
  "flood-color",
  "flood-opacity",
  "flow-from",
  "flow-into",
  "font",
  "font-family",
  "font-feature-settings",
  "font-size",
  "font-size-adjust",
  "font-stretch",
  "font-style",
  "font-variant",
  "font-weight",
  "glyph-orientation-horizontal",
  "glyph-orientation-vertical",
  "grid-column",
  "grid-column-align",
  "grid-column-span",
  "grid-columns",
  "grid-row",
  "grid-row-align",
  "grid-row-span",
  "grid-rows",
  "height",
  "high-contrast-adjust",
  "hyphenate-limit-chars",
  "hyphenate-limit-lines",
  "hyphenate-limit-zone",
  "hyphens",
  "ime-align",
  "ime-mode",
  "interpolation-mode",
  "justify-content",
  "kerning",
  "layout-flow",
  "layout-grid",
  "layout-grid-char",
  "layout-grid-line",
  "layout-grid-mode",
  "layout-grid-type",
  "left",
  "letter-spacing",
  "lighting-color",
  "line-break",
  "line-height",
  "list-style",
  "list-style-image",
  "list-style-position",
  "list-style-type",
  "margin",
  "margin-bottom",
  "margin-left",
  "margin-right",
  "margin-top",
  "marker",
  "marker-end",
  "marker-mid",
  "marker-start",
  "mask",
  "max-height",
  "max-width",
  "min-height",
  "min-width",
  "opacity",
  "order",
  "orphans",
  "outline",
  "outline-color",
  "outline-style",
  "outline-width",
  "overflow",
  "overflow-style",
  "overflow-x",
  "overflow-y",
  "padding",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "padding-top",
  "page-break-after",
  "page-break-before",
  "page-break-inside",
  "perspective",
  "perspective-origin",
  "pointer-events",
  "position",
  "quotes",
  "right",
  "ruby-align",
  "ruby-overhang",
  "ruby-position",
  "scroll-chaining",
  "scroll-limit",
  "scroll-limit-x-max",
  "scroll-limit-x-min",
  "scroll-limit-y-max",
  "scroll-limit-y-min",
  "scroll-rails",
  "scroll-snap-points-x",
  "scroll-snap-points-y",
  "scroll-snap-type",
  "scroll-snap-x",
  "scroll-snap-y",
  "scroll-translation",
  "scrollbar-arrow-color",
  "scrollbar-base-color",
  "scrollbar-dark-shadow-color",
  "scrollbar-face-color",
  "scrollbar-highlight-color",
  "scrollbar-shadow-color",
  "scrollbar-track-color",
  "scrollbar3d-light-color",
  "stop-color",
  "stop-opacity",
  "stroke",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-opacity",
  "stroke-width",
  "style-float",
  "table-layout",
  "text-align",
  "text-align-last",
  "text-anchor",
  "text-autospace",
  "text-combine-horizontal",
  "text-decoration",
  "text-indent",
  "text-justify",
  "text-justify-trim",
  "text-kashida",
  "text-kashida-space",
  "text-overflow",
  "text-shadow",
  "text-transform",
  "text-underline-position",
  "top",
  "touch-action",
  "touch-select",
  "transform",
  "transform-origin",
  "transform-style",
  "transition",
  "transition-delay",
  "transition-duration",
  "transition-property",
  "transition-timing-function",
  "unicode-bidi",
  "user-select",
  "vertical-align",
  "visibility",
  "white-space",
  "widows",
  "width",
  "word-break",
  "word-spacing",
  "word-wrap",
  "wrap-flow",
  "wrap-margin",
  "wrap-through",
  "writing-mode",
  "z-index",
  "zoom"
];
},{}],22:[function(require,module,exports){
module.exports = [
  "accelerator",
  "alignment-baseline",
  "animation",
  "animation-delay",
  "animation-direction",
  "animation-duration",
  "animation-fill-mode",
  "animation-iteration-count",
  "animation-name",
  "animation-play-state",
  "animation-timing-function",
  "backface-visibility",
  "background",
  "background-attachment",
  "background-clip",
  "background-color",
  "background-image",
  "background-origin",
  "background-position",
  "background-position-x",
  "background-position-y",
  "background-repeat",
  "background-size",
  "baseline-shift",
  "behavior",
  "block-progression",
  "border",
  "border-bottom",
  "border-bottom-color",
  "border-bottom-left-radius",
  "border-bottom-right-radius",
  "border-bottom-style",
  "border-bottom-width",
  "border-collapse",
  "border-color",
  "border-left",
  "border-left-color",
  "border-left-style",
  "border-left-width",
  "border-radius",
  "border-right",
  "border-right-color",
  "border-right-style",
  "border-right-width",
  "border-spacing",
  "border-style",
  "border-top",
  "border-top-color",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-top-style",
  "border-top-width",
  "border-width",
  "bottom",
  "box-shadow",
  "box-sizing",
  "break-after",
  "break-before",
  "break-inside",
  "caption-side",
  "clear",
  "clip",
  "clip-path",
  "clip-rule",
  "color",
  "color-interpolation-filters",
  "column-count",
  "column-fill",
  "column-gap",
  "column-rule",
  "column-rule-color",
  "column-rule-style",
  "column-rule-width",
  "column-span",
  "column-width",
  "columns",
  "content",
  "content-zoom-chaining",
  "content-zoom-limit",
  "content-zoom-limit-max",
  "content-zoom-limit-min",
  "content-zoom-snap",
  "content-zoom-snap-points",
  "content-zoom-snap-type",
  "content-zooming",
  "counter-increment",
  "counter-reset",
  "cursor",
  "direction",
  "display",
  "dominant-baseline",
  "empty-cells",
  "enable-background",
  "fill",
  "fill-opacity",
  "fill-rule",
  "filter",
  "flex",
  "flex-align",
  "flex-direction",
  "flex-flow",
  "flex-item-align",
  "flex-line-pack",
  "flex-negative",
  "flex-order",
  "flex-pack",
  "flex-positive",
  "flex-preferred-size",
  "flex-wrap",
  "flood-color",
  "flood-opacity",
  "flow-from",
  "flow-into",
  "font",
  "font-family",
  "font-feature-settings",
  "font-size",
  "font-size-adjust",
  "font-stretch",
  "font-style",
  "font-variant",
  "font-weight",
  "glyph-orientation-horizontal",
  "glyph-orientation-vertical",
  "grid-column",
  "grid-column-align",
  "grid-column-span",
  "grid-columns",
  "grid-row",
  "grid-row-align",
  "grid-row-span",
  "grid-rows",
  "height",
  "high-contrast-adjust",
  "hyphenate-limit-chars",
  "hyphenate-limit-lines",
  "hyphenate-limit-zone",
  "hyphens",
  "ime-mode",
  "interpolation-mode",
  "kerning",
  "layout-flow",
  "layout-grid",
  "layout-grid-char",
  "layout-grid-line",
  "layout-grid-mode",
  "layout-grid-type",
  "left",
  "letter-spacing",
  "lighting-color",
  "line-break",
  "line-height",
  "list-style",
  "list-style-image",
  "list-style-position",
  "list-style-type",
  "margin",
  "margin-bottom",
  "margin-left",
  "margin-right",
  "margin-top",
  "marker",
  "marker-end",
  "marker-mid",
  "marker-start",
  "mask",
  "max-height",
  "max-width",
  "min-height",
  "min-width",
  "opacity",
  "orphans",
  "outline",
  "outline-color",
  "outline-style",
  "outline-width",
  "overflow",
  "overflow-style",
  "overflow-x",
  "overflow-y",
  "padding",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "padding-top",
  "page-break-after",
  "page-break-before",
  "page-break-inside",
  "perspective",
  "perspective-origin",
  "pointer-events",
  "position",
  "quotes",
  "right",
  "ruby-align",
  "ruby-overhang",
  "ruby-position",
  "scroll-chaining",
  "scroll-limit",
  "scroll-limit-x-max",
  "scroll-limit-x-min",
  "scroll-limit-y-max",
  "scroll-limit-y-min",
  "scroll-rails",
  "scroll-snap-points-x",
  "scroll-snap-points-y",
  "scroll-snap-type",
  "scroll-snap-x",
  "scroll-snap-y",
  "scroll-translation",
  "scrollbar-arrow-color",
  "scrollbar-base-color",
  "scrollbar-dark-shadow-color",
  "scrollbar-face-color",
  "scrollbar-highlight-color",
  "scrollbar-shadow-color",
  "scrollbar-track-color",
  "scrollbar3d-light-color",
  "stop-color",
  "stop-opacity",
  "stroke",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-opacity",
  "stroke-width",
  "style-float",
  "table-layout",
  "text-align",
  "text-align-last",
  "text-anchor",
  "text-autospace",
  "text-decoration",
  "text-indent",
  "text-justify",
  "text-justify-trim",
  "text-kashida",
  "text-kashida-space",
  "text-overflow",
  "text-shadow",
  "text-transform",
  "text-underline-position",
  "top",
  "touch-action",
  "touch-select",
  "transform",
  "transform-origin",
  "transform-style",
  "transition",
  "transition-delay",
  "transition-duration",
  "transition-property",
  "transition-timing-function",
  "unicode-bidi",
  "user-select",
  "vertical-align",
  "visibility",
  "white-space",
  "widows",
  "width",
  "word-break",
  "word-spacing",
  "word-wrap",
  "wrap-flow",
  "wrap-margin",
  "wrap-through",
  "writing-mode",
  "z-index",
  "zoom"
];
},{}],23:[function(require,module,exports){
module.exports=require(21)
},{}],24:[function(require,module,exports){
module.exports = [
  "accelerator",
  "background",
  "background-attachment",
  "background-color",
  "background-image",
  "background-position",
  "background-position-x",
  "background-position-y",
  "background-repeat",
  "behavior",
  "border",
  "border-bottom",
  "border-bottom-color",
  "border-bottom-style",
  "border-bottom-width",
  "border-collapse",
  "border-color",
  "border-left",
  "border-left-color",
  "border-left-style",
  "border-left-width",
  "border-right",
  "border-right-color",
  "border-right-style",
  "border-right-width",
  "border-style",
  "border-top",
  "border-top-color",
  "border-top-style",
  "border-top-width",
  "border-width",
  "bottom",
  "clear",
  "clip",
  "color",
  "cursor",
  "direction",
  "display",
  "filter",
  "font",
  "font-family",
  "font-size",
  "font-style",
  "font-variant",
  "font-weight",
  "height",
  "ime-mode",
  "layout-flow",
  "layout-grid",
  "layout-grid-char",
  "layout-grid-line",
  "layout-grid-mode",
  "layout-grid-type",
  "left",
  "letter-spacing",
  "line-break",
  "line-height",
  "list-style",
  "list-style-image",
  "list-style-position",
  "list-style-type",
  "margin",
  "margin-bottom",
  "margin-left",
  "margin-right",
  "margin-top",
  "min-height",
  "overflow",
  "overflow-x",
  "overflow-y",
  "padding",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "padding-top",
  "page-break-after",
  "page-break-before",
  "position",
  "right",
  "ruby-align",
  "ruby-overhang",
  "ruby-position",
  "scrollbar-arrow-color",
  "scrollbar-base-color",
  "scrollbar-dark-shadow-color",
  "scrollbar-face-color",
  "scrollbar-highlight-color",
  "scrollbar-shadow-color",
  "scrollbar-track-color",
  "scrollbar3d-light-color",
  "style-float",
  "table-layout",
  "text-align",
  "text-align-last",
  "text-autospace",
  "text-decoration",
  "text-indent",
  "text-justify",
  "text-justify-trim",
  "text-kashida",
  "text-kashida-space",
  "text-overflow",
  "text-transform",
  "text-underline-position",
  "top",
  "unicode-bidi",
  "vertical-align",
  "visibility",
  "white-space",
  "width",
  "word-break",
  "word-spacing",
  "word-wrap",
  "writing-mode",
  "zoom"
];
},{}],25:[function(require,module,exports){
module.exports = [
  "accelerator",
  "background",
  "background-attachment",
  "background-color",
  "background-image",
  "background-position",
  "background-position-x",
  "background-position-y",
  "background-repeat",
  "behavior",
  "border",
  "border-bottom",
  "border-bottom-color",
  "border-bottom-style",
  "border-bottom-width",
  "border-collapse",
  "border-color",
  "border-left",
  "border-left-color",
  "border-left-style",
  "border-left-width",
  "border-right",
  "border-right-color",
  "border-right-style",
  "border-right-width",
  "border-style",
  "border-top",
  "border-top-color",
  "border-top-style",
  "border-top-width",
  "border-width",
  "bottom",
  "clear",
  "clip",
  "color",
  "cursor",
  "direction",
  "display",
  "filter",
  "font",
  "font-family",
  "font-size",
  "font-style",
  "font-variant",
  "font-weight",
  "height",
  "ime-mode",
  "interpolation-mode",
  "layout-flow",
  "layout-grid",
  "layout-grid-char",
  "layout-grid-line",
  "layout-grid-mode",
  "layout-grid-type",
  "left",
  "letter-spacing",
  "line-break",
  "line-height",
  "list-style",
  "list-style-image",
  "list-style-position",
  "list-style-type",
  "margin",
  "margin-bottom",
  "margin-left",
  "margin-right",
  "margin-top",
  "max-height",
  "max-width",
  "min-height",
  "min-width",
  "overflow",
  "overflow-x",
  "overflow-y",
  "padding",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "padding-top",
  "page-break-after",
  "page-break-before",
  "position",
  "right",
  "ruby-align",
  "ruby-overhang",
  "ruby-position",
  "scrollbar-arrow-color",
  "scrollbar-base-color",
  "scrollbar-dark-shadow-color",
  "scrollbar-face-color",
  "scrollbar-highlight-color",
  "scrollbar-shadow-color",
  "scrollbar-track-color",
  "scrollbar3d-light-color",
  "style-float",
  "table-layout",
  "text-align",
  "text-align-last",
  "text-autospace",
  "text-decoration",
  "text-indent",
  "text-justify",
  "text-justify-trim",
  "text-kashida",
  "text-kashida-space",
  "text-overflow",
  "text-transform",
  "text-underline-position",
  "top",
  "unicode-bidi",
  "vertical-align",
  "visibility",
  "white-space",
  "width",
  "word-break",
  "word-spacing",
  "word-wrap",
  "writing-mode",
  "zoom"
];
},{}],26:[function(require,module,exports){
module.exports = [
  "accelerator",
  "background",
  "background-attachment",
  "background-color",
  "background-image",
  "background-position",
  "background-position-x",
  "background-position-y",
  "background-repeat",
  "behavior",
  "block-progression",
  "border",
  "border-bottom",
  "border-bottom-color",
  "border-bottom-style",
  "border-bottom-width",
  "border-collapse",
  "border-color",
  "border-left",
  "border-left-color",
  "border-left-style",
  "border-left-width",
  "border-right",
  "border-right-color",
  "border-right-style",
  "border-right-width",
  "border-spacing",
  "border-style",
  "border-top",
  "border-top-color",
  "border-top-style",
  "border-top-width",
  "border-width",
  "bottom",
  "box-sizing",
  "caption-side",
  "clear",
  "clip",
  "color",
  "content",
  "counter-increment",
  "counter-reset",
  "cursor",
  "direction",
  "display",
  "empty-cells",
  "filter",
  "font",
  "font-family",
  "font-size",
  "font-style",
  "font-variant",
  "font-weight",
  "height",
  "ime-mode",
  "interpolation-mode",
  "layout-flow",
  "layout-grid",
  "layout-grid-char",
  "layout-grid-line",
  "layout-grid-mode",
  "layout-grid-type",
  "left",
  "letter-spacing",
  "line-break",
  "line-height",
  "list-style",
  "list-style-image",
  "list-style-position",
  "list-style-type",
  "margin",
  "margin-bottom",
  "margin-left",
  "margin-right",
  "margin-top",
  "max-height",
  "max-width",
  "min-height",
  "min-width",
  "orphans",
  "outline",
  "outline-color",
  "outline-style",
  "outline-width",
  "overflow",
  "overflow-x",
  "overflow-y",
  "padding",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "padding-top",
  "page-break-after",
  "page-break-before",
  "page-break-inside",
  "position",
  "quotes",
  "right",
  "ruby-align",
  "ruby-overhang",
  "ruby-position",
  "scrollbar-arrow-color",
  "scrollbar-base-color",
  "scrollbar-dark-shadow-color",
  "scrollbar-face-color",
  "scrollbar-highlight-color",
  "scrollbar-shadow-color",
  "scrollbar-track-color",
  "scrollbar3d-light-color",
  "style-float",
  "table-layout",
  "text-align",
  "text-align-last",
  "text-autospace",
  "text-decoration",
  "text-indent",
  "text-justify",
  "text-justify-trim",
  "text-kashida",
  "text-kashida-space",
  "text-overflow",
  "text-transform",
  "text-underline-position",
  "top",
  "unicode-bidi",
  "vertical-align",
  "visibility",
  "white-space",
  "widows",
  "width",
  "word-break",
  "word-spacing",
  "word-wrap",
  "writing-mode",
  "z-index",
  "zoom"
];
},{}],27:[function(require,module,exports){
module.exports = [
  "accelerator",
  "alignment-baseline",
  "background",
  "background-attachment",
  "background-clip",
  "background-color",
  "background-image",
  "background-origin",
  "background-position",
  "background-position-x",
  "background-position-y",
  "background-repeat",
  "background-size",
  "baseline-shift",
  "behavior",
  "block-progression",
  "border",
  "border-bottom",
  "border-bottom-color",
  "border-bottom-left-radius",
  "border-bottom-right-radius",
  "border-bottom-style",
  "border-bottom-width",
  "border-collapse",
  "border-color",
  "border-left",
  "border-left-color",
  "border-left-style",
  "border-left-width",
  "border-radius",
  "border-right",
  "border-right-color",
  "border-right-style",
  "border-right-width",
  "border-spacing",
  "border-style",
  "border-top",
  "border-top-color",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-top-style",
  "border-top-width",
  "border-width",
  "bottom",
  "box-shadow",
  "box-sizing",
  "caption-side",
  "clear",
  "clip",
  "clip-path",
  "clip-rule",
  "color",
  "content",
  "counter-increment",
  "counter-reset",
  "cursor",
  "direction",
  "display",
  "dominant-baseline",
  "empty-cells",
  "fill",
  "fill-opacity",
  "fill-rule",
  "filter",
  "font",
  "font-family",
  "font-size",
  "font-size-adjust",
  "font-stretch",
  "font-style",
  "font-variant",
  "font-weight",
  "glyph-orientation-horizontal",
  "glyph-orientation-vertical",
  "height",
  "ime-mode",
  "interpolation-mode",
  "kerning",
  "layout-flow",
  "layout-grid",
  "layout-grid-char",
  "layout-grid-line",
  "layout-grid-mode",
  "layout-grid-type",
  "left",
  "letter-spacing",
  "line-break",
  "line-height",
  "list-style",
  "list-style-image",
  "list-style-position",
  "list-style-type",
  "margin",
  "margin-bottom",
  "margin-left",
  "margin-right",
  "margin-top",
  "marker",
  "marker-end",
  "marker-mid",
  "marker-start",
  "mask",
  "max-height",
  "max-width",
  "min-height",
  "min-width",
  "opacity",
  "orphans",
  "outline",
  "outline-color",
  "outline-style",
  "outline-width",
  "overflow",
  "overflow-x",
  "overflow-y",
  "padding",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "padding-top",
  "page-break-after",
  "page-break-before",
  "page-break-inside",
  "pointer-events",
  "position",
  "quotes",
  "right",
  "ruby-align",
  "ruby-overhang",
  "ruby-position",
  "scrollbar-arrow-color",
  "scrollbar-base-color",
  "scrollbar-dark-shadow-color",
  "scrollbar-face-color",
  "scrollbar-highlight-color",
  "scrollbar-shadow-color",
  "scrollbar-track-color",
  "scrollbar3d-light-color",
  "stop-color",
  "stop-opacity",
  "stroke",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-opacity",
  "stroke-width",
  "style-float",
  "table-layout",
  "text-align",
  "text-align-last",
  "text-anchor",
  "text-autospace",
  "text-decoration",
  "text-indent",
  "text-justify",
  "text-justify-trim",
  "text-kashida",
  "text-kashida-space",
  "text-overflow",
  "text-transform",
  "text-underline-position",
  "top",
  "transform",
  "transform-origin",
  "unicode-bidi",
  "vertical-align",
  "visibility",
  "white-space",
  "widows",
  "width",
  "word-break",
  "word-spacing",
  "word-wrap",
  "writing-mode",
  "z-index",
  "zoom"
];
},{}],28:[function(require,module,exports){
module.exports = [
  "alignment-baseline",
  "animation",
  "animation-delay",
  "animation-direction",
  "animation-duration",
  "animation-fill-mode",
  "animation-iteration-count",
  "animation-name",
  "animation-play-state",
  "animation-timing-function",
  "appearance",
  "aspect-ratio",
  "backface-visibility",
  "background",
  "background-attachment",
  "background-clip",
  "background-color",
  "background-composite",
  "background-image",
  "background-origin",
  "background-position",
  "background-position-x",
  "background-position-y",
  "background-repeat",
  "background-repeat-x",
  "background-repeat-y",
  "background-size",
  "baseline-shift",
  "border",
  "border-after",
  "border-after-color",
  "border-after-style",
  "border-after-width",
  "border-before",
  "border-before-color",
  "border-before-style",
  "border-before-width",
  "border-bottom",
  "border-bottom-color",
  "border-bottom-left-radius",
  "border-bottom-right-radius",
  "border-bottom-style",
  "border-bottom-width",
  "border-collapse",
  "border-color",
  "border-end",
  "border-end-color",
  "border-end-style",
  "border-end-width",
  "border-fit",
  "border-horizontal-spacing",
  "border-image",
  "border-image-outset",
  "border-image-repeat",
  "border-image-slice",
  "border-image-source",
  "border-image-width",
  "border-left",
  "border-left-color",
  "border-left-style",
  "border-left-width",
  "border-radius",
  "border-right",
  "border-right-color",
  "border-right-style",
  "border-right-width",
  "border-spacing",
  "border-start",
  "border-start-color",
  "border-start-style",
  "border-start-width",
  "border-style",
  "border-top",
  "border-top-color",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-top-style",
  "border-top-width",
  "border-vertical-spacing",
  "border-width",
  "bottom",
  "box-align",
  "box-direction",
  "box-flex",
  "box-flex-group",
  "box-lines",
  "box-ordinal-group",
  "box-orient",
  "box-pack",
  "box-reflect",
  "box-shadow",
  "box-sizing",
  "caption-side",
  "clear",
  "clip",
  "clip-path",
  "clip-rule",
  "color",
  "color-correction",
  "color-interpolation",
  "color-interpolation-filters",
  "color-profile",
  "color-rendering",
  "column-axis",
  "column-break-after",
  "column-break-before",
  "column-break-inside",
  "column-count",
  "column-gap",
  "column-progression",
  "column-rule",
  "column-rule-color",
  "column-rule-style",
  "column-rule-width",
  "column-span",
  "column-width",
  "columns",
  "composition-fill-color",
  "composition-frame-color",
  "content",
  "counter-increment",
  "counter-reset",
  "cursor",
  "direction",
  "display",
  "dominant-baseline",
  "empty-cells",
  "enable-background",
  "fill",
  "fill-opacity",
  "fill-rule",
  "filter",
  "float",
  "flood-color",
  "flood-opacity",
  "font",
  "font-family",
  "font-feature-settings",
  "font-kerning",
  "font-size",
  "font-size-delta",
  "font-smoothing",
  "font-stretch",
  "font-style",
  "font-variant",
  "font-variant-ligatures",
  "font-weight",
  "glyph-orientation-horizontal",
  "glyph-orientation-vertical",
  "grid-column",
  "grid-columns",
  "grid-row",
  "grid-rows",
  "height",
  "highlight",
  "hyphenate-character",
  "hyphenate-limit-after",
  "hyphenate-limit-before",
  "hyphenate-limit-lines",
  "hyphens",
  "image-rendering",
  "kerning",
  "left",
  "letter-spacing",
  "lighting-color",
  "line-align",
  "line-box-contain",
  "line-break",
  "line-clamp",
  "line-grid",
  "line-height",
  "line-snap",
  "list-style",
  "list-style-image",
  "list-style-position",
  "list-style-type",
  "locale",
  "logical-height",
  "logical-width",
  "margin",
  "margin-after",
  "margin-after-collapse",
  "margin-before",
  "margin-before-collapse",
  "margin-bottom",
  "margin-bottom-collapse",
  "margin-collapse",
  "margin-end",
  "margin-left",
  "margin-right",
  "margin-start",
  "margin-top",
  "margin-top-collapse",
  "marker",
  "marker-end",
  "marker-mid",
  "marker-start",
  "marquee",
  "marquee-direction",
  "marquee-increment",
  "marquee-repetition",
  "marquee-speed",
  "marquee-style",
  "mask",
  "mask-attachment",
  "mask-box-image",
  "mask-box-image-outset",
  "mask-box-image-repeat",
  "mask-box-image-slice",
  "mask-box-image-source",
  "mask-box-image-width",
  "mask-clip",
  "mask-composite",
  "mask-image",
  "mask-origin",
  "mask-position",
  "mask-position-x",
  "mask-position-y",
  "mask-repeat",
  "mask-repeat-x",
  "mask-repeat-y",
  "mask-size",
  "match-nearest-mail-blockquote-color",
  "max-height",
  "max-logical-height",
  "max-logical-width",
  "max-width",
  "min-height",
  "min-logical-height",
  "min-logical-width",
  "min-width",
  "nbsp-mode",
  "opacity",
  "orphans",
  "outline",
  "outline-color",
  "outline-offset",
  "outline-style",
  "outline-width",
  "overflow",
  "overflow-scrolling",
  "overflow-x",
  "overflow-y",
  "padding",
  "padding-after",
  "padding-before",
  "padding-bottom",
  "padding-end",
  "padding-left",
  "padding-right",
  "padding-start",
  "padding-top",
  "page",
  "page-break-after",
  "page-break-before",
  "page-break-inside",
  "perspective",
  "perspective-origin",
  "perspective-origin-x",
  "perspective-origin-y",
  "pointer-events",
  "position",
  "print-color-adjust",
  "quotes",
  "resize",
  "right",
  "rtl-ordering",
  "shape-rendering",
  "size",
  "speak",
  "src",
  "stop-color",
  "stop-opacity",
  "stroke",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-opacity",
  "stroke-width",
  "svg-shadow",
  "table-layout",
  "tap-highlight-color",
  "text-align",
  "text-anchor",
  "text-combine",
  "text-decoration",
  "text-decorations-in-effect",
  "text-emphasis",
  "text-emphasis-color",
  "text-emphasis-position",
  "text-emphasis-style",
  "text-fill-color",
  "text-indent",
  "text-line-through",
  "text-line-through-color",
  "text-line-through-mode",
  "text-line-through-style",
  "text-line-through-width",
  "text-orientation",
  "text-overflow",
  "text-overline",
  "text-overline-color",
  "text-overline-mode",
  "text-overline-style",
  "text-overline-width",
  "text-rendering",
  "text-security",
  "text-shadow",
  "text-size-adjust",
  "text-stroke",
  "text-stroke-color",
  "text-stroke-width",
  "text-transform",
  "text-underline",
  "text-underline-color",
  "text-underline-mode",
  "text-underline-style",
  "text-underline-width",
  "top",
  "touch-callout",
  "transform",
  "transform-origin",
  "transform-origin-x",
  "transform-origin-y",
  "transform-origin-z",
  "transform-style",
  "transition",
  "transition-delay",
  "transition-duration",
  "transition-property",
  "transition-timing-function",
  "unicode-bidi",
  "unicode-range",
  "user-drag",
  "user-modify",
  "user-select",
  "vector-effect",
  "vertical-align",
  "visibility",
  "white-space",
  "widows",
  "width",
  "word-break",
  "word-spacing",
  "word-wrap",
  "writing-mode",
  "z-index",
  "zoom"
];
},{}],29:[function(require,module,exports){
module.exports = [
  "accesskey",
  "align-content",
  "align-items",
  "align-self",
  "alignment-baseline",
  "animation",
  "animation-delay",
  "animation-direction",
  "animation-duration",
  "animation-fill-mode",
  "animation-iteration-count",
  "animation-name",
  "animation-play-state",
  "animation-timing-function",
  "audio-level",
  "background",
  "background-attachment",
  "background-clip",
  "background-color",
  "background-image",
  "background-origin",
  "background-position",
  "background-repeat",
  "background-size",
  "baseline-shift",
  "border",
  "border-bottom",
  "border-bottom-color",
  "border-bottom-left-radius",
  "border-bottom-right-radius",
  "border-bottom-style",
  "border-bottom-width",
  "border-collapse",
  "border-color",
  "border-image",
  "border-left",
  "border-left-color",
  "border-left-style",
  "border-left-width",
  "border-radius",
  "border-right",
  "border-right-color",
  "border-right-style",
  "border-right-width",
  "border-spacing",
  "border-style",
  "border-top",
  "border-top-color",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-top-style",
  "border-top-width",
  "border-width",
  "bottom",
  "box-decoration-break",
  "box-shadow",
  "box-sizing",
  "break-after",
  "break-before",
  "break-inside",
  "buffered-rendering",
  "caption-side",
  "clear",
  "clip",
  "clip-path",
  "clip-rule",
  "color",
  "color-interpolation",
  "color-interpolation-filters",
  "color-profile",
  "color-rendering",
  "column-count",
  "column-fill",
  "column-gap",
  "column-rule",
  "column-rule-color",
  "column-rule-style",
  "column-rule-width",
  "column-span",
  "column-width",
  "columns",
  "content",
  "counter-increment",
  "counter-reset",
  "cursor",
  "dashboard-region",
  "direction",
  "display",
  "display-align",
  "dominant-baseline",
  "empty-cells",
  "enable-background",
  "fill",
  "fill-opacity",
  "fill-rule",
  "filter",
  "flex",
  "flex-basis",
  "flex-direction",
  "flex-flow",
  "flex-grow",
  "flex-shrink",
  "flex-wrap",
  "flood-color",
  "flood-opacity",
  "font",
  "font-family",
  "font-size",
  "font-size-adjust",
  "font-stretch",
  "font-style",
  "font-variant",
  "font-weight",
  "glyph-orientation-horizontal",
  "glyph-orientation-vertical",
  "height",
  "image-rendering",
  "input-format",
  "input-required",
  "justify-content",
  "kerning",
  "left",
  "letter-spacing",
  "lighting-color",
  "line-height",
  "line-increment",
  "link",
  "link-source",
  "list-style",
  "list-style-image",
  "list-style-position",
  "list-style-type",
  "margin",
  "margin-bottom",
  "margin-left",
  "margin-right",
  "margin-top",
  "marker",
  "marker-end",
  "marker-mid",
  "marker-offset",
  "marker-start",
  "marquee-dir",
  "marquee-loop",
  "marquee-speed",
  "marquee-style",
  "mask",
  "max-height",
  "max-width",
  "max-zoom",
  "min-height",
  "min-width",
  "min-zoom",
  "nav-down",
  "nav-index",
  "nav-left",
  "nav-right",
  "nav-up",
  "object-fit",
  "object-position",
  "opacity",
  "order",
  "orientation",
  "orphans",
  "outline",
  "outline-color",
  "outline-offset",
  "outline-style",
  "outline-width",
  "overflow",
  "overflow-wrap",
  "overflow-x",
  "overflow-y",
  "padding",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "padding-top",
  "page",
  "page-break-after",
  "page-break-before",
  "page-break-inside",
  "pointer-events",
  "position",
  "quotes",
  "resize",
  "right",
  "scrollbar-arrow-color",
  "scrollbar-base-color",
  "scrollbar-darkshadow-color",
  "scrollbar-face-color",
  "scrollbar-highlight-color",
  "scrollbar-shadow-color",
  "scrollbar-track-color",
  "scrollbar3dlight-color",
  "shape-rendering",
  "size",
  "solid-color",
  "solid-opacity",
  "src",
  "stop-color",
  "stop-opacity",
  "stroke",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-opacity",
  "stroke-width",
  "style-float",
  "tab-size",
  "table-baseline",
  "table-layout",
  "text-align",
  "text-anchor",
  "text-decoration",
  "text-indent",
  "text-overflow",
  "text-rendering",
  "text-shadow",
  "text-transform",
  "top",
  "transform",
  "transform-origin",
  "transition",
  "transition-delay",
  "transition-duration",
  "transition-property",
  "transition-timing-function",
  "unicode-bidi",
  "user-zoom",
  "vector-effect",
  "vertical-align",
  "viewport-fill",
  "viewport-fill-opacity",
  "visibility",
  "white-space",
  "widows",
  "width",
  "word-spacing",
  "word-wrap",
  "writing-mode",
  "z-index",
  "zoom"
];
},{}],30:[function(require,module,exports){
module.exports = [
  "align-content",
  "align-items",
  "align-self",
  "alignment-baseline",
  "animation",
  "animation-delay",
  "animation-direction",
  "animation-duration",
  "animation-fill-mode",
  "animation-iteration-count",
  "animation-name",
  "animation-play-state",
  "animation-timing-function",
  "appearance",
  "aspect-ratio",
  "backface-visibility",
  "background",
  "background-attachment",
  "background-clip",
  "background-color",
  "background-composite",
  "background-image",
  "background-origin",
  "background-position",
  "background-position-x",
  "background-position-y",
  "background-repeat",
  "background-repeat-x",
  "background-repeat-y",
  "background-size",
  "baseline-shift",
  "border",
  "border-after",
  "border-after-color",
  "border-after-style",
  "border-after-width",
  "border-before",
  "border-before-color",
  "border-before-style",
  "border-before-width",
  "border-bottom",
  "border-bottom-color",
  "border-bottom-left-radius",
  "border-bottom-right-radius",
  "border-bottom-style",
  "border-bottom-width",
  "border-collapse",
  "border-color",
  "border-end",
  "border-end-color",
  "border-end-style",
  "border-end-width",
  "border-fit",
  "border-horizontal-spacing",
  "border-image",
  "border-image-outset",
  "border-image-repeat",
  "border-image-slice",
  "border-image-source",
  "border-image-width",
  "border-left",
  "border-left-color",
  "border-left-style",
  "border-left-width",
  "border-radius",
  "border-right",
  "border-right-color",
  "border-right-style",
  "border-right-width",
  "border-spacing",
  "border-start",
  "border-start-color",
  "border-start-style",
  "border-start-width",
  "border-style",
  "border-top",
  "border-top-color",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-top-style",
  "border-top-width",
  "border-vertical-spacing",
  "border-width",
  "bottom",
  "box-align",
  "box-decoration-break",
  "box-direction",
  "box-flex",
  "box-flex-group",
  "box-lines",
  "box-ordinal-group",
  "box-orient",
  "box-pack",
  "box-reflect",
  "box-shadow",
  "box-sizing",
  "buffered-rendering",
  "caption-side",
  "clear",
  "clip",
  "clip-path",
  "clip-rule",
  "color",
  "color-correction",
  "color-interpolation",
  "color-interpolation-filters",
  "color-profile",
  "color-rendering",
  "column-axis",
  "column-break-after",
  "column-break-before",
  "column-break-inside",
  "column-count",
  "column-gap",
  "column-progression",
  "column-rule",
  "column-rule-color",
  "column-rule-style",
  "column-rule-width",
  "column-span",
  "column-width",
  "columns",
  "content",
  "counter-increment",
  "counter-reset",
  "cursor",
  "cursor-visibility",
  "dashboard-region",
  "direction",
  "display",
  "dominant-baseline",
  "empty-cells",
  "enable-background",
  "fill",
  "fill-opacity",
  "fill-rule",
  "filter",
  "flex",
  "flex-basis",
  "flex-direction",
  "flex-flow",
  "flex-grow",
  "flex-shrink",
  "flex-wrap",
  "float",
  "flood-color",
  "flood-opacity",
  "flow-from",
  "flow-into",
  "font",
  "font-family",
  "font-feature-settings",
  "font-kerning",
  "font-size",
  "font-size-delta",
  "font-smoothing",
  "font-stretch",
  "font-style",
  "font-variant",
  "font-variant-ligatures",
  "font-weight",
  "glyph-orientation-horizontal",
  "glyph-orientation-vertical",
  "grid-after",
  "grid-auto-columns",
  "grid-auto-flow",
  "grid-auto-rows",
  "grid-before",
  "grid-column",
  "grid-columns",
  "grid-end",
  "grid-row",
  "grid-rows",
  "grid-start",
  "height",
  "highlight",
  "hyphenate-character",
  "hyphenate-limit-after",
  "hyphenate-limit-before",
  "hyphenate-limit-lines",
  "hyphens",
  "image-rendering",
  "justify-content",
  "kerning",
  "left",
  "letter-spacing",
  "lighting-color",
  "line-align",
  "line-box-contain",
  "line-break",
  "line-clamp",
  "line-grid",
  "line-height",
  "line-snap",
  "list-style",
  "list-style-image",
  "list-style-position",
  "list-style-type",
  "locale",
  "logical-height",
  "logical-width",
  "margin",
  "margin-after",
  "margin-after-collapse",
  "margin-before",
  "margin-before-collapse",
  "margin-bottom",
  "margin-bottom-collapse",
  "margin-collapse",
  "margin-end",
  "margin-left",
  "margin-right",
  "margin-start",
  "margin-top",
  "margin-top-collapse",
  "marker",
  "marker-end",
  "marker-mid",
  "marker-start",
  "marquee",
  "marquee-direction",
  "marquee-increment",
  "marquee-repetition",
  "marquee-speed",
  "marquee-style",
  "mask",
  "mask-box-image",
  "mask-box-image-outset",
  "mask-box-image-repeat",
  "mask-box-image-slice",
  "mask-box-image-source",
  "mask-box-image-width",
  "mask-clip",
  "mask-composite",
  "mask-image",
  "mask-origin",
  "mask-position",
  "mask-position-x",
  "mask-position-y",
  "mask-repeat",
  "mask-repeat-x",
  "mask-repeat-y",
  "mask-size",
  "mask-type",
  "max-height",
  "max-logical-height",
  "max-logical-width",
  "max-width",
  "min-height",
  "min-logical-height",
  "min-logical-width",
  "min-width",
  "nbsp-mode",
  "opacity",
  "order",
  "orphans",
  "outline",
  "outline-color",
  "outline-offset",
  "outline-style",
  "outline-width",
  "overflow",
  "overflow-wrap",
  "overflow-x",
  "overflow-y",
  "padding",
  "padding-after",
  "padding-before",
  "padding-bottom",
  "padding-end",
  "padding-left",
  "padding-right",
  "padding-start",
  "padding-top",
  "page",
  "page-break-after",
  "page-break-before",
  "page-break-inside",
  "perspective",
  "perspective-origin",
  "perspective-origin-x",
  "perspective-origin-y",
  "pointer-events",
  "position",
  "print-color-adjust",
  "quotes",
  "region-break-after",
  "region-break-before",
  "region-break-inside",
  "region-fragment",
  "resize",
  "right",
  "rtl-ordering",
  "ruby-position",
  "shape-rendering",
  "size",
  "speak",
  "src",
  "stop-color",
  "stop-opacity",
  "stroke",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-opacity",
  "stroke-width",
  "svg-shadow",
  "tab-size",
  "table-layout",
  "text-align",
  "text-anchor",
  "text-combine",
  "text-decoration",
  "text-decorations-in-effect",
  "text-emphasis",
  "text-emphasis-color",
  "text-emphasis-position",
  "text-emphasis-style",
  "text-fill-color",
  "text-indent",
  "text-line-through",
  "text-line-through-color",
  "text-line-through-mode",
  "text-line-through-style",
  "text-line-through-width",
  "text-orientation",
  "text-overflow",
  "text-overline",
  "text-overline-color",
  "text-overline-mode",
  "text-overline-style",
  "text-overline-width",
  "text-rendering",
  "text-security",
  "text-shadow",
  "text-stroke",
  "text-stroke-color",
  "text-stroke-width",
  "text-transform",
  "text-underline",
  "text-underline-color",
  "text-underline-mode",
  "text-underline-style",
  "text-underline-width",
  "top",
  "transform",
  "transform-origin",
  "transform-origin-x",
  "transform-origin-y",
  "transform-origin-z",
  "transform-style",
  "transition",
  "transition-delay",
  "transition-duration",
  "transition-property",
  "transition-timing-function",
  "unicode-bidi",
  "unicode-range",
  "user-drag",
  "user-modify",
  "user-select",
  "vector-effect",
  "vertical-align",
  "visibility",
  "white-space",
  "widows",
  "width",
  "word-break",
  "word-spacing",
  "word-wrap",
  "writing-mode",
  "z-index",
  "zoom"
];
},{}],31:[function(require,module,exports){
exports.chrome = require("./browsers/chrome.js");
exports.firefox = require("./browsers/firefox.js");
exports.ie10 = require("./browsers/ie10.js");
exports.ie11 = require("./browsers/ie11.js");
exports.ie = require("./browsers/ie.js");
exports.ie6 = require("./browsers/ie6.js");
exports.ie7 = require("./browsers/ie7.js");
exports.ie8 = require("./browsers/ie8.js");
exports.ie9 = require("./browsers/ie9.js");
exports.ios = require("./browsers/ios.js");
exports.opera = require("./browsers/opera.js");
exports.safari = require("./browsers/safari.js");
exports.forward = require("./browsers/forward.js");

},{"./browsers/chrome.js":18,"./browsers/firefox.js":19,"./browsers/forward.js":20,"./browsers/ie.js":21,"./browsers/ie10.js":22,"./browsers/ie11.js":23,"./browsers/ie6.js":24,"./browsers/ie7.js":25,"./browsers/ie8.js":26,"./browsers/ie9.js":27,"./browsers/ios.js":28,"./browsers/opera.js":29,"./browsers/safari.js":30}],32:[function(require,module,exports){
var gonzales = require('gonzales');
var traverse = require('./lib/traverse.js');
var utils = require('./lib/utils.js');

exports.parse = gonzales.srcToCSSP;
exports.toCSS = gonzales.csspToSrc;
exports.toTree = gonzales.csspToTree;
exports.traverse = traverse;
exports.same = utils.same;
},{"./lib/traverse.js":33,"./lib/utils.js":34,"gonzales":37}],33:[function(require,module,exports){
function tree(node, visitor) {
  if (!Array.isArray(node)) {
    return node;
  }

  if (visitor.test && visitor.test(node[0], node[1])) {
    node = visitor.process(node);
    if (!node) {
      return;
    }
  }

  var res = [node[0]];
  for (var i = 1; i < node.length; i++) {
    var n = tree(node[i], visitor);
    n && res.push(n);
  }
  return res;
}


module.exports = function traverse (ast, visitors) {
  visitors.forEach(function(visitor) {
    ast = tree(ast, visitor);
  });
  return ast;
};

},{}],34:[function(require,module,exports){
exports.same = function same (ast1, ast2) {
  return JSON.stringify(ast1) === JSON.stringify(ast2);
};

},{}],35:[function(require,module,exports){
// version: 1.0.0

function csspToSrc(tree, hasInfo) {

    var _m_simple = {
            'unary': 1, 'nth': 1, 'combinator': 1, 'ident': 1, 'number': 1, 's': 1,
            'string': 1, 'attrselector': 1, 'operator': 1, 'raw': 1, 'unknown': 1
        },
        _m_composite = {
            'simpleselector': 1, 'dimension': 1, 'selector': 1, 'property': 1, 'value': 1,
            'filterv': 1, 'progid': 1, 'ruleset': 1, 'atruleb': 1, 'atrulerq': 1, 'atrulers': 1,
            'stylesheet': 1
        },
        _m_primitive = {
            'cdo': 'cdo', 'cdc': 'cdc', 'decldelim': ';', 'namespace': '|', 'delim': ','
        };

    function _t(tree) {
        var t = tree[hasInfo? 1 : 0];
        if (t in _m_primitive) return _m_primitive[t];
        else if (t in _m_simple) return _simple(tree);
        else if (t in _m_composite) return _composite(tree);
        return _unique[t](tree);
    }

    function _composite(t, i) {
        var s = '';
        i = i === undefined ? (hasInfo? 2 : 1) : i;
        for (; i < t.length; i++) s += _t(t[i]);
        return s;
    }

    function _simple(t) {
        return t[hasInfo? 2 : 1];
    }

    var _unique = {
        percentage: function(t) {
            return _t(t[hasInfo? 2 : 1]) + '%';
        },
        comment: function (t) {
            return '/*' + t[hasInfo? 2 : 1] + '*/';
        },
        clazz: function(t) {
            return '.' + _t(t[hasInfo? 2 : 1]);
        },
        atkeyword: function(t) {
            return '@' + _t(t[hasInfo? 2 : 1]);
        },
        shash: function (t) {
            return '#' + t[hasInfo? 2 : 1];
        },
        vhash: function(t) {
            return '#' + t[hasInfo? 2 : 1];
        },
        attrib: function(t) {
            return '[' + _composite(t) + ']';
        },
        important: function(t) {
            return '!' + _composite(t) + 'important';
        },
        nthselector: function(t) {
            return ':' + _simple(t[hasInfo? 2 : 1]) + '(' + _composite(t, hasInfo? 3 : 2) + ')';
        },
        funktion: function(t) {
            return _simple(t[hasInfo? 2 : 1]) + '(' + _composite(t[hasInfo? 3: 2]) + ')';
        },
        declaration: function(t) {
            return _t(t[hasInfo? 2 : 1]) + ':' + _t(t[hasInfo? 3 : 2]);
        },
        filter: function(t) {
            return _t(t[hasInfo? 2 : 1]) + ':' + _t(t[hasInfo? 3 : 2]);
        },
        block: function(t) {
            return '{' + _composite(t) + '}';
        },
        braces: function(t) {
            return t[hasInfo? 2 : 1] + _composite(t, hasInfo? 4 : 3) + t[hasInfo? 3 : 2];
        },
        atrules: function(t) {
            return _composite(t) + ';';
        },
        atruler: function(t) {
            return _t(t[hasInfo? 2 : 1]) + _t(t[hasInfo? 3 : 2]) + '{' + _t(t[hasInfo? 4 : 3]) + '}';
        },
        pseudoe: function(t) {
            return '::' + _t(t[hasInfo? 2 : 1]);
        },
        pseudoc: function(t) {
            return ':' + _t(t[hasInfo? 2 : 1]);
        },
        uri: function(t) {
            return 'url(' + _composite(t) + ')';
        },
        functionExpression: function(t) {
            return 'expression(' + t[hasInfo? 2 : 1] + ')';
        }
    };

    return _t(tree);
}
exports.csspToSrc = csspToSrc;

},{}],36:[function(require,module,exports){
var srcToCSSP = (function() {
var TokenType = {
    StringSQ: 'StringSQ',
    StringDQ: 'StringDQ',
    CommentML: 'CommentML',
    CommentSL: 'CommentSL',

    Newline: 'Newline',
    Space: 'Space',
    Tab: 'Tab',

    ExclamationMark: 'ExclamationMark',         // !
    QuotationMark: 'QuotationMark',             // "
    NumberSign: 'NumberSign',                   // #
    DollarSign: 'DollarSign',                   // $
    PercentSign: 'PercentSign',                 // %
    Ampersand: 'Ampersand',                     // &
    Apostrophe: 'Apostrophe',                   // '
    LeftParenthesis: 'LeftParenthesis',         // (
    RightParenthesis: 'RightParenthesis',       // )
    Asterisk: 'Asterisk',                       // *
    PlusSign: 'PlusSign',                       // +
    Comma: 'Comma',                             // ,
    HyphenMinus: 'HyphenMinus',                 // -
    FullStop: 'FullStop',                       // .
    Solidus: 'Solidus',                         // /
    Colon: 'Colon',                             // :
    Semicolon: 'Semicolon',                     // ;
    LessThanSign: 'LessThanSign',               // <
    EqualsSign: 'EqualsSign',                   // =
    GreaterThanSign: 'GreaterThanSign',         // >
    QuestionMark: 'QuestionMark',               // ?
    CommercialAt: 'CommercialAt',               // @
    LeftSquareBracket: 'LeftSquareBracket',     // [
    ReverseSolidus: 'ReverseSolidus',           // \
    RightSquareBracket: 'RightSquareBracket',   // ]
    CircumflexAccent: 'CircumflexAccent',       // ^
    LowLine: 'LowLine',                         // _
    LeftCurlyBracket: 'LeftCurlyBracket',       // {
    VerticalLine: 'VerticalLine',               // |
    RightCurlyBracket: 'RightCurlyBracket',     // }
    Tilde: 'Tilde',                             // ~

    Identifier: 'Identifier',
    DecimalNumber: 'DecimalNumber'
};

var getTokens = (function() {

    var Punctuation,
        urlMode = false,
        blockMode = 0;

    Punctuation = {
        ' ': TokenType.Space,
        '\n': TokenType.Newline,
        '\r': TokenType.Newline,
        '\t': TokenType.Tab,
        '!': TokenType.ExclamationMark,
        '"': TokenType.QuotationMark,
        '#': TokenType.NumberSign,
        '$': TokenType.DollarSign,
        '%': TokenType.PercentSign,
        '&': TokenType.Ampersand,
        '\'': TokenType.Apostrophe,
        '(': TokenType.LeftParenthesis,
        ')': TokenType.RightParenthesis,
        '*': TokenType.Asterisk,
        '+': TokenType.PlusSign,
        ',': TokenType.Comma,
        '-': TokenType.HyphenMinus,
        '.': TokenType.FullStop,
        '/': TokenType.Solidus,
        ':': TokenType.Colon,
        ';': TokenType.Semicolon,
        '<': TokenType.LessThanSign,
        '=': TokenType.EqualsSign,
        '>': TokenType.GreaterThanSign,
        '?': TokenType.QuestionMark,
        '@': TokenType.CommercialAt,
        '[': TokenType.LeftSquareBracket,
    //        '\\': TokenType.ReverseSolidus,
        ']': TokenType.RightSquareBracket,
        '^': TokenType.CircumflexAccent,
        '_': TokenType.LowLine,
        '{': TokenType.LeftCurlyBracket,
        '|': TokenType.VerticalLine,
        '}': TokenType.RightCurlyBracket,
        '~': TokenType.Tilde
    };

    function isDecimalDigit(c) {
        return '0123456789'.indexOf(c) >= 0;
    }

    function throwError(message) {
        throw message;
    }

    var buffer = '',
        tokens = [],
        pos,
        tn = 0,
        ln = 1;

    function _getTokens(s) {
        if (!s) return [];

        tokens = [];

        var c, cn;

        for (pos = 0; pos < s.length; pos++) {
            c = s.charAt(pos);
            cn = s.charAt(pos + 1);

            if (c === '/' && cn === '*') {
                parseMLComment(s);
            } else if (!urlMode && c === '/' && cn === '/') {
                if (blockMode > 0) parseIdentifier(s); 
                else parseSLComment(s);
            } else if (c === '"' || c === "'") {
                parseString(s, c);
            } else if (c === ' ') {
                parseSpaces(s)
            } else if (c in Punctuation) {
                pushToken(Punctuation[c], c);
                if (c === '\n' || c === '\r') ln++;
                if (c === ')') urlMode = false;
                if (c === '{') blockMode++;
                if (c === '}') blockMode--;
            } else if (isDecimalDigit(c)) {
                parseDecimalNumber(s);
            } else {
                parseIdentifier(s);
            }
        }

        mark();

        return tokens;
    }

    function pushToken(type, value) {
        tokens.push({ tn: tn++, ln: ln, type: type, value: value });
    }

    function parseSpaces(s) {
        var start = pos;

        for (; pos < s.length; pos++) {
            if (s.charAt(pos) !== ' ') break;
        }

        pushToken(TokenType.Space, s.substring(start, pos));
        pos--;
    }

    function parseMLComment(s) {
        var start = pos;

        for (pos = pos + 2; pos < s.length; pos++) {
            if (s.charAt(pos) === '*') {
                if (s.charAt(pos + 1) === '/') {
                    pos++;
                    break;
                }
            }
        }

        pushToken(TokenType.CommentML, s.substring(start, pos + 1));
    }

    function parseSLComment(s) {
        var start = pos;

        for (pos = pos + 2; pos < s.length; pos++) {
            if (s.charAt(pos) === '\n' || s.charAt(pos) === '\r') {
                pos++;
                break;
            }
        }

        pushToken(TokenType.CommentSL, s.substring(start, pos));
        pos--;
    }

    function parseString(s, q) {
        var start = pos;

        for (pos = pos + 1; pos < s.length; pos++) {
            if (s.charAt(pos) === '\\') pos++;
            else if (s.charAt(pos) === q) break;
        }

        pushToken(q === '"' ? TokenType.StringDQ : TokenType.StringSQ, s.substring(start, pos + 1));
    }

    function parseDecimalNumber(s) {
        var start = pos;

        for (; pos < s.length; pos++) {
            if (!isDecimalDigit(s.charAt(pos))) break;
        }

        pushToken(TokenType.DecimalNumber, s.substring(start, pos));
        pos--;
    }

    function parseIdentifier(s) {
        var start = pos;

        while (s.charAt(pos) === '/') pos++;

        for (; pos < s.length; pos++) {
            if (s.charAt(pos) === '\\') pos++;
            else if (s.charAt(pos) in Punctuation) break;
        }

        var ident = s.substring(start, pos);

        urlMode = urlMode || ident === 'url';

        pushToken(TokenType.Identifier, ident);
        pos--;
    }

    // ====================================
    // second run
    // ====================================

    function mark() {
        var ps = [], // Parenthesis
            sbs = [], // SquareBracket
            cbs = [], // CurlyBracket
            t;

        for (var i = 0; i < tokens.length; i++) {
            t = tokens[i];
            switch(t.type) {
                case TokenType.LeftParenthesis:
                    ps.push(i);
                    break;
                case TokenType.RightParenthesis:
                    if (ps.length) {
                        t.left = ps.pop();
                        tokens[t.left].right = i;
                    }
                    break;
                case TokenType.LeftSquareBracket:
                    sbs.push(i);
                    break;
                case TokenType.RightSquareBracket:
                    if (sbs.length) {
                        t.left = sbs.pop();
                        tokens[t.left].right = i;
                    }
                    break;
                case TokenType.LeftCurlyBracket:
                    cbs.push(i);
                    break;
                case TokenType.RightCurlyBracket:
                    if (cbs.length) {
                        t.left = cbs.pop();
                        tokens[t.left].right = i;
                    }
                    break;
            }
        }
    }

    return function(s) {
        return _getTokens(s);
    };

}());
// version: 1.0.0

var getCSSPAST = (function() {

    var tokens,
        pos,
        failLN = 0,
        currentBlockLN = 0,
        needInfo = false;

    var CSSPNodeType,
        CSSLevel,
        CSSPRules;

    CSSPNodeType = {
        IdentType: 'ident',
        AtkeywordType: 'atkeyword',
        StringType: 'string',
        ShashType: 'shash',
        VhashType: 'vhash',
        NumberType: 'number',
        PercentageType: 'percentage',
        DimensionType: 'dimension',
        CdoType: 'cdo',
        CdcType: 'cdc',
        DecldelimType: 'decldelim',
        SType: 's',
        AttrselectorType: 'attrselector',
        AttribType: 'attrib',
        NthType: 'nth',
        NthselectorType: 'nthselector',
        NamespaceType: 'namespace',
        ClazzType: 'clazz',
        PseudoeType: 'pseudoe',
        PseudocType: 'pseudoc',
        DelimType: 'delim',
        StylesheetType: 'stylesheet',
        AtrulebType: 'atruleb',
        AtrulesType: 'atrules',
        AtrulerqType: 'atrulerq',
        AtrulersType: 'atrulers',
        AtrulerType: 'atruler',
        BlockType: 'block',
        RulesetType: 'ruleset',
        CombinatorType: 'combinator',
        SimpleselectorType: 'simpleselector',
        SelectorType: 'selector',
        DeclarationType: 'declaration',
        PropertyType: 'property',
        ImportantType: 'important',
        UnaryType: 'unary',
        OperatorType: 'operator',
        BracesType: 'braces',
        ValueType: 'value',
        ProgidType: 'progid',
        FiltervType: 'filterv',
        FilterType: 'filter',
        CommentType: 'comment',
        UriType: 'uri',
        RawType: 'raw',
        FunctionBodyType: 'functionBody',
        FunktionType: 'funktion',
        FunctionExpressionType: 'functionExpression',
        UnknownType: 'unknown'
    };

    CSSPRules = {
        'ident': function() { if (checkIdent(pos)) return getIdent() },
        'atkeyword': function() { if (checkAtkeyword(pos)) return getAtkeyword() },
        'string': function() { if (checkString(pos)) return getString() },
        'shash': function() { if (checkShash(pos)) return getShash() },
        'vhash': function() { if (checkVhash(pos)) return getVhash() },
        'number': function() { if (checkNumber(pos)) return getNumber() },
        'percentage': function() { if (checkPercentage(pos)) return getPercentage() },
        'dimension': function() { if (checkDimension(pos)) return getDimension() },
//        'cdo': function() { if (checkCDO()) return getCDO() },
//        'cdc': function() { if (checkCDC()) return getCDC() },
        'decldelim': function() { if (checkDecldelim(pos)) return getDecldelim() },
        's': function() { if (checkS(pos)) return getS() },
        'attrselector': function() { if (checkAttrselector(pos)) return getAttrselector() },
        'attrib': function() { if (checkAttrib(pos)) return getAttrib() },
        'nth': function() { if (checkNth(pos)) return getNth() },
        'nthselector': function() { if (checkNthselector(pos)) return getNthselector() },
        'namespace': function() { if (checkNamespace(pos)) return getNamespace() },
        'clazz': function() { if (checkClazz(pos)) return getClazz() },
        'pseudoe': function() { if (checkPseudoe(pos)) return getPseudoe() },
        'pseudoc': function() { if (checkPseudoc(pos)) return getPseudoc() },
        'delim': function() { if (checkDelim(pos)) return getDelim() },
        'stylesheet': function() { if (checkStylesheet(pos)) return getStylesheet() },
        'atruleb': function() { if (checkAtruleb(pos)) return getAtruleb() },
        'atrules': function() { if (checkAtrules(pos)) return getAtrules() },
        'atrulerq': function() { if (checkAtrulerq(pos)) return getAtrulerq() },
        'atrulers': function() { if (checkAtrulers(pos)) return getAtrulers() },
        'atruler': function() { if (checkAtruler(pos)) return getAtruler() },
        'block': function() { if (checkBlock(pos)) return getBlock() },
        'ruleset': function() { if (checkRuleset(pos)) return getRuleset() },
        'combinator': function() { if (checkCombinator(pos)) return getCombinator() },
        'simpleselector': function() { if (checkSimpleselector(pos)) return getSimpleSelector() },
        'selector': function() { if (checkSelector(pos)) return getSelector() },
        'declaration': function() { if (checkDeclaration(pos)) return getDeclaration() },
        'property': function() { if (checkProperty(pos)) return getProperty() },
        'important': function() { if (checkImportant(pos)) return getImportant() },
        'unary': function() { if (checkUnary(pos)) return getUnary() },
        'operator': function() { if (checkOperator(pos)) return getOperator() },
        'braces': function() { if (checkBraces(pos)) return getBraces() },
        'value': function() { if (checkValue(pos)) return getValue() },
        'progid': function() { if (checkProgid(pos)) return getProgid() },
        'filterv': function() { if (checkFilterv(pos)) return getFilterv() },
        'filter': function() { if (checkFilter(pos)) return getFilter() },
        'comment': function() { if (checkComment(pos)) return getComment() },
        'uri': function() { if (checkUri(pos)) return getUri() },
        'raw': function() { if (checkRaw(pos)) return getRaw() },
        'funktion': function() { if (checkFunktion(pos)) return getFunktion() },
        'functionExpression': function() { if (checkFunctionExpression(pos)) return getFunctionExpression() },
        'unknown': function() { if (checkUnknown(pos)) return getUnknown() }
    };

    function fail(token) {
        if (token && token.ln > failLN) failLN = token.ln;
    }

    function throwError() {
        throw new Error('Please check the validity of the CSS block starting from the line #' + currentBlockLN);
    }

    function _getAST(_tokens, rule, _needInfo) {
        tokens = _tokens;
        needInfo = _needInfo;
        pos = 0;

        markSC();

        return rule ? CSSPRules[rule]() : CSSPRules['stylesheet']();
    }

//any = braces | string | percentage | dimension | number | uri | functionExpression | funktion | ident | unary
    function checkAny(_i) {
        return checkBraces(_i) ||
               checkString(_i) ||
               checkPercentage(_i) ||
               checkDimension(_i) ||
               checkNumber(_i) ||
               checkUri(_i) ||
               checkFunctionExpression(_i) ||
               checkFunktion(_i) ||
               checkIdent(_i) ||
               checkUnary(_i);
    }

    function getAny() {
        if (checkBraces(pos)) return getBraces();
        else if (checkString(pos)) return getString();
        else if (checkPercentage(pos)) return getPercentage();
        else if (checkDimension(pos)) return getDimension();
        else if (checkNumber(pos)) return getNumber();
        else if (checkUri(pos)) return getUri();
        else if (checkFunctionExpression(pos)) return getFunctionExpression();
        else if (checkFunktion(pos)) return getFunktion();
        else if (checkIdent(pos)) return getIdent();
        else if (checkUnary(pos)) return getUnary();
    }

//atkeyword = '@' ident:x -> [#atkeyword, x]
    function checkAtkeyword(_i) {
        var l;

        if (tokens[_i++].type !== TokenType.CommercialAt) return fail(tokens[_i - 1]);

        if (l = checkIdent(_i)) return l + 1;

        return fail(tokens[_i]);
    }

    function getAtkeyword() {
        var startPos = pos;

        pos++;

        return needInfo?
            [{ ln: tokens[startPos].ln }, CSSPNodeType.AtkeywordType, getIdent()]:
            [CSSPNodeType.AtkeywordType, getIdent()];
    }

//attrib = '[' sc*:s0 ident:x sc*:s1 attrselector:a sc*:s2 (ident | string):y sc*:s3 ']' -> this.concat([#attrib], s0, [x], s1, [a], s2, [y], s3)
//       | '[' sc*:s0 ident:x sc*:s1 ']' -> this.concat([#attrib], s0, [x], s1),
    function checkAttrib(_i) {
        if (tokens[_i].type !== TokenType.LeftSquareBracket) return fail(tokens[_i]);

        if (!tokens[_i].right) return fail(tokens[_i]);

        return tokens[_i].right - _i + 1;
    }

    function checkAttrib1(_i) {
        var start = _i;

        _i++;

        var l = checkSC(_i); // s0

        if (l) _i += l;

        if (l = checkIdent(_i)) _i += l; // x
        else return fail(tokens[_i]);

        if (l = checkSC(_i)) _i += l; // s1

        if (l = checkAttrselector(_i)) _i += l; // a
        else return fail(tokens[_i]);

        if (l = checkSC(_i)) _i += l; // s2

        if ((l = checkIdent(_i)) || (l = checkString(_i))) _i += l; // y
        else return fail(tokens[_i]);

        if (l = checkSC(_i)) _i += l; // s3

        if (tokens[_i].type === TokenType.RightSquareBracket) return _i - start;

        return fail(tokens[_i]);
    }

    function getAttrib1() {
        var startPos = pos;

        pos++;

        var a = (needInfo? [{ ln: tokens[startPos].ln }, CSSPNodeType.AttribType] : [CSSPNodeType.AttribType])
                .concat(getSC())
                .concat([getIdent()])
                .concat(getSC())
                .concat([getAttrselector()])
                .concat(getSC())
                .concat([checkString(pos)? getString() : getIdent()])
                .concat(getSC());

        pos++;

        return a;
    }

    function checkAttrib2(_i) {
        var start = _i;

        _i++;

        var l = checkSC(_i);

        if (l) _i += l;

        if (l = checkIdent(_i)) _i += l;

        if (l = checkSC(_i)) _i += l;

        if (tokens[_i].type === TokenType.RightSquareBracket) return _i - start;

        return fail(tokens[_i]);
    }

    function getAttrib2() {
        var startPos = pos;

        pos++;

        var a = (needInfo? [{ ln: tokens[startPos].ln }, CSSPNodeType.AttribType] : [CSSPNodeType.AttribType])
                .concat(getSC())
                .concat([getIdent()])
                .concat(getSC());

        pos++;

        return a;
    }

    function getAttrib() {
        if (checkAttrib1(pos)) return getAttrib1(); 
        if (checkAttrib2(pos)) return getAttrib2(); 
    }

//attrselector = (seq('=') | seq('~=') | seq('^=') | seq('$=') | seq('*=') | seq('|=')):x -> [#attrselector, x]
    function checkAttrselector(_i) {
        if (tokens[_i].type === TokenType.EqualsSign) return 1;
        if (tokens[_i].type === TokenType.VerticalLine && (!tokens[_i + 1] || tokens[_i + 1].type !== TokenType.EqualsSign)) return 1;

        if (!tokens[_i + 1] || tokens[_i + 1].type !== TokenType.EqualsSign) return fail(tokens[_i]);

        switch(tokens[_i].type) {
            case TokenType.Tilde:
            case TokenType.CircumflexAccent:
            case TokenType.DollarSign:
            case TokenType.Asterisk:
            case TokenType.VerticalLine:
                return 2;
        }

        return fail(tokens[_i]);
    }

    function getAttrselector() {
        var startPos = pos,
            s = tokens[pos++].value;

        if (tokens[pos] && tokens[pos].type === TokenType.EqualsSign) s += tokens[pos++].value;

        return needInfo?
                [{ ln: tokens[startPos].ln }, CSSPNodeType.AttrselectorType, s] :
                [CSSPNodeType.AttrselectorType, s];
    }

//atrule = atruler | atruleb | atrules
    function checkAtrule(_i) {
        var start = _i,
            l;

        if (tokens[start].atrule_l !== undefined) return tokens[start].atrule_l;

        if (l = checkAtruler(_i)) tokens[_i].atrule_type = 1;
        else if (l = checkAtruleb(_i)) tokens[_i].atrule_type = 2;
        else if (l = checkAtrules(_i)) tokens[_i].atrule_type = 3;
        else return fail(tokens[start]);

        tokens[start].atrule_l = l;

        return l;
    }

    function getAtrule() {
        switch (tokens[pos].atrule_type) {
            case 1: return getAtruler();
            case 2: return getAtruleb();
            case 3: return getAtrules();
        }
    }

//atruleb = atkeyword:ak tset*:ap block:b -> this.concat([#atruleb, ak], ap, [b])
    function checkAtruleb(_i) {
        var start = _i,
            l;

        if (l = checkAtkeyword(_i)) _i += l;
        else return fail(tokens[_i]);

        if (l = checkTsets(_i)) _i += l;

        if (l = checkBlock(_i)) _i += l;
        else return fail(tokens[_i]);

        return _i - start;
    }

    function getAtruleb() {
        return (needInfo?
                    [{ ln: tokens[pos].ln }, CSSPNodeType.AtrulebType, getAtkeyword()] :
                    [CSSPNodeType.AtrulebType, getAtkeyword()])
                        .concat(getTsets())
                        .concat([getBlock()]);
    }

//atruler = atkeyword:ak atrulerq:x '{' atrulers:y '}' -> [#atruler, ak, x, y]
    function checkAtruler(_i) {
        var start = _i,
            l;

        if (l = checkAtkeyword(_i)) _i += l;
        else return fail(tokens[_i]);

        if (l = checkAtrulerq(_i)) _i += l;

        if (_i < tokens.length && tokens[_i].type === TokenType.LeftCurlyBracket) _i++;
        else return fail(tokens[_i]);

        if (l = checkAtrulers(_i)) _i += l;

        if (_i < tokens.length && tokens[_i].type === TokenType.RightCurlyBracket) _i++;
        else return fail(tokens[_i]);

        return _i - start;
    }

    function getAtruler() {
        var atruler = needInfo?
                        [{ ln: tokens[pos].ln }, CSSPNodeType.AtrulerType, getAtkeyword(), getAtrulerq()] :
                        [CSSPNodeType.AtrulerType, getAtkeyword(), getAtrulerq()];

        pos++;

        atruler.push(getAtrulers());

        pos++;

        return atruler;
    }

//atrulerq = tset*:ap -> [#atrulerq].concat(ap)
    function checkAtrulerq(_i) {
        return checkTsets(_i);
    }

    function getAtrulerq() {
        return (needInfo? [{ ln: tokens[pos].ln }, CSSPNodeType.AtrulerqType] : [CSSPNodeType.AtrulerqType]).concat(getTsets());
    }

//atrulers = sc*:s0 ruleset*:r sc*:s1 -> this.concat([#atrulers], s0, r, s1)
    function checkAtrulers(_i) {
        var start = _i,
            l;

        if (l = checkSC(_i)) _i += l;

        while ((l = checkRuleset(_i)) || (l = checkAtrule(_i)) || (l = checkSC(_i))) {
            _i += l;
        }

        tokens[_i].atrulers_end = 1;

        if (l = checkSC(_i)) _i += l;

        return _i - start;
    }

    function getAtrulers() {
        var atrulers = (needInfo? [{ ln: tokens[pos].ln }, CSSPNodeType.AtrulersType] : [CSSPNodeType.AtrulersType]).concat(getSC()),
            x;

        while (!tokens[pos].atrulers_end) {
            if (checkSC(pos)) {
                atrulers = atrulers.concat(getSC());
            } else if (checkRuleset(pos)) {
                atrulers.push(getRuleset());
            } else {
                atrulers.push(getAtrule());
            }
        }

        return atrulers.concat(getSC());
    }

//atrules = atkeyword:ak tset*:ap ';' -> this.concat([#atrules, ak], ap)
    function checkAtrules(_i) {
        var start = _i,
            l;

        if (l = checkAtkeyword(_i)) _i += l;
        else return fail(tokens[_i]);

        if (l = checkTsets(_i)) _i += l;

        if (_i >= tokens.length) return _i - start;

        if (tokens[_i].type === TokenType.Semicolon) _i++;
        else return fail(tokens[_i]);

        return _i - start;
    }

    function getAtrules() {
        var atrules = (needInfo? [{ ln: tokens[pos].ln }, CSSPNodeType.AtrulesType, getAtkeyword()] : [CSSPNodeType.AtrulesType, getAtkeyword()]).concat(getTsets());

        pos++;

        return atrules;
    }

//block = '{' blockdecl*:x '}' -> this.concatContent([#block], x)
    function checkBlock(_i) {
        if (_i < tokens.length && tokens[_i].type === TokenType.LeftCurlyBracket) return tokens[_i].right - _i + 1;

        return fail(tokens[_i]);
    }

    function getBlock() {
        var block = needInfo? [{ ln: tokens[pos].ln }, CSSPNodeType.BlockType] : [CSSPNodeType.BlockType],
            end = tokens[pos].right;

        pos++;

        while (pos < end) {
            if (checkBlockdecl(pos)) block = block.concat(getBlockdecl());
            else throwError();
        }

        pos = end + 1;

        return block;
    }

//blockdecl = sc*:s0 (filter | declaration):x decldelim:y sc*:s1 -> this.concat(s0, [x], [y], s1)
//          | sc*:s0 (filter | declaration):x sc*:s1 -> this.concat(s0, [x], s1)
//          | sc*:s0 decldelim:x sc*:s1 -> this.concat(s0, [x], s1)
//          | sc+:s0 -> s0

    function checkBlockdecl(_i) {
        var l;

        if (l = _checkBlockdecl0(_i)) tokens[_i].bd_type = 1;
        else if (l = _checkBlockdecl1(_i)) tokens[_i].bd_type = 2;
        else if (l = _checkBlockdecl2(_i)) tokens[_i].bd_type = 3;
        else if (l = _checkBlockdecl3(_i)) tokens[_i].bd_type = 4;
        else return fail(tokens[_i]);

        return l;
    }

    function getBlockdecl() {
        switch (tokens[pos].bd_type) {
            case 1: return _getBlockdecl0();
            case 2: return _getBlockdecl1();
            case 3: return _getBlockdecl2();
            case 4: return _getBlockdecl3();
        }
    }

    //sc*:s0 (filter | declaration):x decldelim:y sc*:s1 -> this.concat(s0, [x], [y], s1)
    function _checkBlockdecl0(_i) {
        var start = _i,
            l;

        if (l = checkSC(_i)) _i += l;

        if (l = checkFilter(_i)) {
            tokens[_i].bd_filter = 1;
            _i += l;
        } else if (l = checkDeclaration(_i)) {
            tokens[_i].bd_decl = 1;
            _i += l;
        } else return fail(tokens[_i]);

        if (_i < tokens.length && (l = checkDecldelim(_i))) _i += l;
        else return fail(tokens[_i]);

        if (l = checkSC(_i)) _i += l;

        return _i - start;
    }

    function _getBlockdecl0() {
        return getSC()
                .concat([tokens[pos].bd_filter? getFilter() : getDeclaration()])
                .concat([getDecldelim()])
                .concat(getSC());
    }

    //sc*:s0 (filter | declaration):x sc*:s1 -> this.concat(s0, [x], s1)
    function _checkBlockdecl1(_i) {
        var start = _i,
            l;

        if (l = checkSC(_i)) _i += l;

        if (l = checkFilter(_i)) {
            tokens[_i].bd_filter = 1;
            _i += l;
        } else if (l = checkDeclaration(_i)) {
            tokens[_i].bd_decl = 1;
            _i += l;
        } else return fail(tokens[_i]);

        if (l = checkSC(_i)) _i += l;

        return _i - start;
    }

    function _getBlockdecl1() {
        return getSC()
                .concat([tokens[pos].bd_filter? getFilter() : getDeclaration()])
                .concat(getSC());
    }

    //sc*:s0 decldelim:x sc*:s1 -> this.concat(s0, [x], s1)
    function _checkBlockdecl2(_i) {
        var start = _i,
            l;

        if (l = checkSC(_i)) _i += l;

        if (l = checkDecldelim(_i)) _i += l;
        else return fail(tokens[_i]);

        if (l = checkSC(_i)) _i += l;

        return _i - start;
    }

    function _getBlockdecl2() {
        return getSC()
                 .concat([getDecldelim()])
                 .concat(getSC());
    }

    //sc+:s0 -> s0
    function _checkBlockdecl3(_i) {
        return checkSC(_i);
    }

    function _getBlockdecl3() {
        return getSC();
    }

//braces = '(' tset*:x ')' -> this.concat([#braces, '(', ')'], x)
//       | '[' tset*:x ']' -> this.concat([#braces, '[', ']'], x)
    function checkBraces(_i) {
        if (_i >= tokens.length ||
            (tokens[_i].type !== TokenType.LeftParenthesis &&
             tokens[_i].type !== TokenType.LeftSquareBracket)
            ) return fail(tokens[_i]);

        return tokens[_i].right - _i + 1;
    }

    function getBraces() {
        var startPos = pos,
            left = pos,
            right = tokens[pos].right;

        pos++;

        var tsets = getTsets();

        pos++;

        return needInfo?
                [{ ln: tokens[startPos].ln }, CSSPNodeType.BracesType, tokens[left].value, tokens[right].value].concat(tsets) :
                [CSSPNodeType.BracesType, tokens[left].value, tokens[right].value].concat(tsets);
    }

    function checkCDC(_i) {}

    function checkCDO(_i) {}

    // node: Clazz
    function checkClazz(_i) {
        var l;

        if (tokens[_i].clazz_l) return tokens[_i].clazz_l;

        if (tokens[_i].type === TokenType.FullStop) {
            if (l = checkIdent(_i + 1)) {
                tokens[_i].clazz_l = l + 1;
                return l + 1;
            }
        }

        return fail(tokens[_i]);
    }

    function getClazz() {
        var startPos = pos;

        pos++;

        return needInfo?
                [{ ln: tokens[startPos].ln }, CSSPNodeType.ClazzType, getIdent()] :
                [CSSPNodeType.ClazzType, getIdent()];
    }

    // node: Combinator
    function checkCombinator(_i) {
        if (tokens[_i].type === TokenType.PlusSign ||
            tokens[_i].type === TokenType.GreaterThanSign ||
            tokens[_i].type === TokenType.Tilde) return 1;

        return fail(tokens[_i]);
    }

    function getCombinator() {
        return needInfo?
                [{ ln: tokens[pos].ln }, CSSPNodeType.CombinatorType, tokens[pos++].value] :
                [CSSPNodeType.CombinatorType, tokens[pos++].value];
    }

    // node: Comment
    function checkComment(_i) {
        if (tokens[_i].type === TokenType.CommentML) return 1;

        return fail(tokens[_i]);
    }

    function getComment() {
        var startPos = pos,
            s = tokens[pos].value.substring(2),
            l = s.length;

        if (s.charAt(l - 2) === '*' && s.charAt(l - 1) === '/') s = s.substring(0, l - 2);

        pos++;

        return needInfo?
                [{ ln: tokens[startPos].ln }, CSSPNodeType.CommentType, s] :
                [CSSPNodeType.CommentType, s];
    }

    // declaration = property:x ':' value:y -> [#declaration, x, y]
    function checkDeclaration(_i) {
        var start = _i,
            l;

        if (l = checkProperty(_i)) _i += l;
        else return fail(tokens[_i]);

        if (_i < tokens.length && tokens[_i].type === TokenType.Colon) _i++;
        else return fail(tokens[_i]);

        if (l = checkValue(_i)) _i += l;
        else return fail(tokens[_i]);

        return _i - start;
    }

    function getDeclaration() {
        var declaration = needInfo?
                [{ ln: tokens[pos].ln }, CSSPNodeType.DeclarationType, getProperty()] :
                [CSSPNodeType.DeclarationType, getProperty()];

        pos++;

        declaration.push(getValue());

        return declaration;
    }

    // node: Decldelim
    function checkDecldelim(_i) {
        if (_i < tokens.length && tokens[_i].type === TokenType.Semicolon) return 1;

        return fail(tokens[_i]);
    }

    function getDecldelim() {
        var startPos = pos;

        pos++;

        return needInfo?
                [{ ln: tokens[startPos].ln }, CSSPNodeType.DecldelimType] :
                [CSSPNodeType.DecldelimType];
    }

    // node: Delim
    function checkDelim(_i) {
        if (_i < tokens.length && tokens[_i].type === TokenType.Comma) return 1;

        if (_i >= tokens.length) return fail(tokens[tokens.length - 1]);

        return fail(tokens[_i]);
    }

    function getDelim() {
        var startPos = pos;

        pos++;

        return needInfo?
                [{ ln: tokens[startPos].ln }, CSSPNodeType.DelimType] :
                [CSSPNodeType.DelimType];
    }

    // node: Dimension
    function checkDimension(_i) {
        var ln = checkNumber(_i),
            li;

        if (!ln || (ln && _i + ln >= tokens.length)) return fail(tokens[_i]);

        if (li = checkNmName2(_i + ln)) return ln + li;

        return fail(tokens[_i]);
    }

    function getDimension() {
        var startPos = pos,
            n = getNumber(),
            dimension = needInfo ?
                [{ ln: tokens[pos].ln }, CSSPNodeType.IdentType, getNmName2()] :
                [CSSPNodeType.IdentType, getNmName2()];

        return needInfo?
                [{ ln: tokens[startPos].ln }, CSSPNodeType.DimensionType, n, dimension] :
                [CSSPNodeType.DimensionType, n, dimension];
    }

//filter = filterp:x ':' filterv:y -> [#filter, x, y]
    function checkFilter(_i) {
        var start = _i,
            l;

        if (l = checkFilterp(_i)) _i += l;
        else return fail(tokens[_i]);

        if (tokens[_i].type === TokenType.Colon) _i++;
        else return fail(tokens[_i]);

        if (l = checkFilterv(_i)) _i += l;
        else return fail(tokens[_i]);

        return _i - start;
    }

    function getFilter() {
        var filter = needInfo?
                [{ ln: tokens[pos].ln }, CSSPNodeType.FilterType, getFilterp()] :
                [CSSPNodeType.FilterType, getFilterp()];

        pos++;

        filter.push(getFilterv());

        return filter;
    }

//filterp = (seq('-filter') | seq('_filter') | seq('*filter') | seq('-ms-filter') | seq('filter')):t sc*:s0 -> this.concat([#property, [#ident, t]], s0)
    function checkFilterp(_i) {
        var start = _i,
            l,
            x;

        if (_i < tokens.length) {
            if (tokens[_i].value === 'filter') l = 1;
            else {
                x = joinValues2(_i, 2);

                if (x === '-filter' || x === '_filter' || x === '*filter') l = 2;
                else {
                    x = joinValues2(_i, 4);

                    if (x === '-ms-filter') l = 4;
                    else return fail(tokens[_i]);
                }
            }

            tokens[start].filterp_l = l;

            _i += l;

            if (checkSC(_i)) _i += l;

            return _i - start;
        }

        return fail(tokens[_i]);
    }

    function getFilterp() {
        var startPos = pos,
            x = joinValues2(pos, tokens[pos].filterp_l),
            ident = needInfo? [{ ln: tokens[startPos].ln }, CSSPNodeType.IdentType, x] : [CSSPNodeType.IdentType, x];

        pos += tokens[pos].filterp_l;

        return (needInfo? [{ ln: tokens[startPos].ln }, CSSPNodeType.PropertyType, ident] : [CSSPNodeType.PropertyType, ident])
                    .concat(getSC());

    }

//filterv = progid+:x -> [#filterv].concat(x)
    function checkFilterv(_i) {
        var start = _i,
            l;

        if (l = checkProgid(_i)) _i += l;
        else return fail(tokens[_i]);

        while (l = checkProgid(_i)) {
            _i += l;
        }

        tokens[start].last_progid = _i;

        if (_i < tokens.length && (l = checkSC(_i))) _i += l;

        if (_i < tokens.length && (l = checkImportant(_i))) _i += l;

        return _i - start;
    }

    function getFilterv() {
        var filterv = needInfo? [{ ln: tokens[pos].ln }, CSSPNodeType.FiltervType] : [CSSPNodeType.FiltervType],
            last_progid = tokens[pos].last_progid;

        while (pos < last_progid) {
            filterv.push(getProgid());
        }

        filterv = filterv.concat(checkSC(pos) ? getSC() : []);

        if (pos < tokens.length && checkImportant(pos)) filterv.push(getImportant());

        return filterv;
    }

//functionExpression = ``expression('' functionExpressionBody*:x ')' -> [#functionExpression, x.join('')],
    function checkFunctionExpression(_i) {
        var start = _i;

        if (!tokens[_i] || tokens[_i++].value !== 'expression') return fail(tokens[_i - 1]);

        if (!tokens[_i] || tokens[_i].type !== TokenType.LeftParenthesis) return fail(tokens[_i]);

        return tokens[_i].right - start + 1;
    }

    function getFunctionExpression() {
        var startPos = pos;

        pos++;

        var e = joinValues(pos + 1, tokens[pos].right - 1);

        pos = tokens[pos].right + 1;

        return needInfo?
                [{ ln: tokens[startPos].ln }, CSSPNodeType.FunctionExpressionType, e] :
                [CSSPNodeType.FunctionExpressionType, e];
    }

//funktion = ident:x '(' functionBody:y ')' -> [#funktion, x, y]
    function checkFunktion(_i) {
        var start = _i,
            l = checkIdent(_i);

        if (!l) return fail(tokens[_i]);

        _i += l;

        if (_i >= tokens.length || tokens[_i].type !== TokenType.LeftParenthesis) return fail(tokens[_i - 1]);

        return tokens[_i].right - start + 1;
    }

    function getFunktion() {
        var startPos = pos,
            ident = getIdent();

        pos++;

        var body = ident[needInfo? 2 : 1] !== 'not'?
            getFunctionBody() :
            getNotFunctionBody(); // ok, here we have CSS3 initial draft: http://dev.w3.org/csswg/selectors3/#negation

        return needInfo?
                [{ ln: tokens[startPos].ln }, CSSPNodeType.FunktionType, ident, body] :
                [CSSPNodeType.FunktionType, ident, body];
    }

    function getFunctionBody() {
        var startPos = pos,
            body = [],
            x;

        while (tokens[pos].type !== TokenType.RightParenthesis) {
            if (checkTset(pos)) {
                x = getTset();
                if ((needInfo && typeof x[1] === 'string') || typeof x[0] === 'string') body.push(x);
                else body = body.concat(x);
            } else if (checkClazz(pos)) {
                body.push(getClazz());
            } else {
                throwError();
            }
        }

        pos++;

        return (needInfo?
                    [{ ln: tokens[startPos].ln }, CSSPNodeType.FunctionBodyType] :
                    [CSSPNodeType.FunctionBodyType]
                ).concat(body);
    }

    function getNotFunctionBody() {
        var startPos = pos,
            body = [],
            x;

        while (tokens[pos].type !== TokenType.RightParenthesis) {
            if (checkSimpleselector(pos)) {
                body.push(getSimpleSelector());
            } else {
                throwError();
            }
        }

        pos++;

        return (needInfo?
                    [{ ln: tokens[startPos].ln }, CSSPNodeType.FunctionBodyType] :
                    [CSSPNodeType.FunctionBodyType]
                ).concat(body);
    }

    // node: Ident
    function checkIdent(_i) {
        if (_i >= tokens.length) return fail(tokens[_i]);

        var start = _i,
            wasIdent = false;

        if (tokens[_i].type === TokenType.LowLine) return checkIdentLowLine(_i);

        // start char / word
        if (tokens[_i].type === TokenType.HyphenMinus ||
            tokens[_i].type === TokenType.Identifier ||
            tokens[_i].type === TokenType.DollarSign ||
            tokens[_i].type === TokenType.Asterisk) _i++;
        else return fail(tokens[_i]);

        wasIdent = tokens[_i - 1].type === TokenType.Identifier;

        for (; _i < tokens.length; _i++) {
            if (tokens[_i].type !== TokenType.HyphenMinus &&
                tokens[_i].type !== TokenType.LowLine) {
                    if (tokens[_i].type !== TokenType.Identifier &&
                        (tokens[_i].type !== TokenType.DecimalNumber || !wasIdent)
                        ) break;
                    else wasIdent = true;
            }   
        }

        if (!wasIdent && tokens[start].type !== TokenType.Asterisk) return fail(tokens[_i]);

        tokens[start].ident_last = _i - 1;

        return _i - start;
    }

    function checkIdentLowLine(_i) {
        var start = _i;

        _i++;

        for (; _i < tokens.length; _i++) {
            if (tokens[_i].type !== TokenType.HyphenMinus &&
                tokens[_i].type !== TokenType.DecimalNumber &&
                tokens[_i].type !== TokenType.LowLine &&
                tokens[_i].type !== TokenType.Identifier) break;
        }

        tokens[start].ident_last = _i - 1;

        return _i - start;
    }

    function getIdent() {
        var startPos = pos,
            s = joinValues(pos, tokens[pos].ident_last);

        pos = tokens[pos].ident_last + 1;

        return needInfo?
                [{ ln: tokens[startPos].ln }, CSSPNodeType.IdentType, s] :
                [CSSPNodeType.IdentType, s];
    }

//important = '!' sc*:s0 seq('important') -> [#important].concat(s0)
    function checkImportant(_i) {
        var start = _i,
            l;

        if (tokens[_i++].type !== TokenType.ExclamationMark) return fail(tokens[_i - 1]);

        if (l = checkSC(_i)) _i += l;

        if (tokens[_i].value !== 'important') return fail(tokens[_i]);

        return _i - start + 1;
    }

    function getImportant() {
        var startPos = pos;

        pos++;

        var sc = getSC();

        pos++;

        return (needInfo? [{ ln: tokens[startPos].ln }, CSSPNodeType.ImportantType] : [CSSPNodeType.ImportantType]).concat(sc);
    }

    // node: Namespace
    function checkNamespace(_i) {
        if (tokens[_i].type === TokenType.VerticalLine) return 1;

        return fail(tokens[_i]);
    }

    function getNamespace() {
        var startPos = pos;

        pos++;

        return needInfo?
                [{ ln: tokens[startPos].ln }, CSSPNodeType.NamespaceType] :
                [CSSPNodeType.NamespaceType];
    }

//nth = (digit | 'n')+:x -> [#nth, x.join('')]
//    | (seq('even') | seq('odd')):x -> [#nth, x]
    function checkNth(_i) {
        return checkNth1(_i) || checkNth2(_i);
    }

    function checkNth1(_i) {
        var start = _i;

        for (; _i < tokens.length; _i++) {
            if (tokens[_i].type !== TokenType.DecimalNumber && tokens[_i].value !== 'n') break;
        }

        if (_i !== start) {
            tokens[start].nth_last = _i - 1;
            return _i - start;
        }

        return fail(tokens[_i]);
    }

    function getNth() {
        var startPos = pos;

        if (tokens[pos].nth_last) {
            var n = needInfo?
                        [{ ln: tokens[startPos].ln }, CSSPNodeType.NthType, joinValues(pos, tokens[pos].nth_last)] :
                        [CSSPNodeType.NthType, joinValues(pos, tokens[pos].nth_last)];

            pos = tokens[pos].nth_last + 1;

            return n;
        }

        return needInfo?
                [{ ln: tokens[startPos].ln }, CSSPNodeType.NthType, tokens[pos++].value] :
                [CSSPNodeType.NthType, tokens[pos++].value];
    }

    function checkNth2(_i) {
        if (tokens[_i].value === 'even' || tokens[_i].value === 'odd') return 1;

        return fail(tokens[_i]);
    }

//nthf = ':' seq('nth-'):x (seq('child') | seq('last-child') | seq('of-type') | seq('last-of-type')):y -> (x + y)
    function checkNthf(_i) {
        var start = _i,
            l = 0;

        if (tokens[_i++].type !== TokenType.Colon) return fail(tokens[_i - 1]); l++;

        if (tokens[_i++].value !== 'nth' || tokens[_i++].value !== '-') return fail(tokens[_i - 1]); l += 2;

        if ('child' === tokens[_i].value) {
            l += 1;
        } else if ('last-child' === tokens[_i].value +
                                    tokens[_i + 1].value +
                                    tokens[_i + 2].value) {
            l += 3;
        } else if ('of-type' === tokens[_i].value +
                                 tokens[_i + 1].value +
                                 tokens[_i + 2].value) {
            l += 3;
        } else if ('last-of-type' === tokens[_i].value +
                                      tokens[_i + 1].value +
                                      tokens[_i + 2].value +
                                      tokens[_i + 3].value +
                                      tokens[_i + 4].value) {
            l += 5;
        } else return fail(tokens[_i]);

        tokens[start + 1].nthf_last = start + l - 1;

        return l;
    }

    function getNthf() {
        pos++;

        var s = joinValues(pos, tokens[pos].nthf_last);

        pos = tokens[pos].nthf_last + 1;

        return s;
    }

//nthselector = nthf:x '(' (sc | unary | nth)*:y ')' -> [#nthselector, [#ident, x]].concat(y)
    function checkNthselector(_i) {
        var start = _i,
            l;

        if (l = checkNthf(_i)) _i += l;
        else return fail(tokens[_i]);

        if (tokens[_i].type !== TokenType.LeftParenthesis || !tokens[_i].right) return fail(tokens[_i]);

        l++;

        var rp = tokens[_i++].right;

        while (_i < rp) {
            if (l = checkSC(_i)) _i += l;
            else if (l = checkUnary(_i)) _i += l;
            else if (l = checkNth(_i)) _i += l;
            else return fail(tokens[_i]);
        }

        return rp - start + 1;
    }

    function getNthselector() {
        var startPos = pos,
            nthf = needInfo?
                    [{ ln: tokens[pos].ln }, CSSPNodeType.IdentType, getNthf()] :
                    [CSSPNodeType.IdentType, getNthf()],
            ns = needInfo?
                    [{ ln: tokens[pos].ln }, CSSPNodeType.NthselectorType, nthf] :
                    [CSSPNodeType.NthselectorType, nthf];

        pos++;

        while (tokens[pos].type !== TokenType.RightParenthesis) {
            if (checkSC(pos)) ns = ns.concat(getSC());
            else if (checkUnary(pos)) ns.push(getUnary());
            else if (checkNth(pos)) ns.push(getNth());
        }

        pos++;

        return ns;
    }

    // node: Number
    function checkNumber(_i) {
        if (_i < tokens.length && tokens[_i].number_l) return tokens[_i].number_l;

        if (_i < tokens.length && tokens[_i].type === TokenType.DecimalNumber &&
            (!tokens[_i + 1] ||
             (tokens[_i + 1] && tokens[_i + 1].type !== TokenType.FullStop))
        ) return (tokens[_i].number_l = 1, tokens[_i].number_l); // 10

        if (_i < tokens.length &&
             tokens[_i].type === TokenType.DecimalNumber &&
             tokens[_i + 1] && tokens[_i + 1].type === TokenType.FullStop &&
             (!tokens[_i + 2] || (tokens[_i + 2].type !== TokenType.DecimalNumber))
        ) return (tokens[_i].number_l = 2, tokens[_i].number_l); // 10.

        if (_i < tokens.length &&
            tokens[_i].type === TokenType.FullStop &&
            tokens[_i + 1].type === TokenType.DecimalNumber
        ) return (tokens[_i].number_l = 2, tokens[_i].number_l); // .10

        if (_i < tokens.length &&
            tokens[_i].type === TokenType.DecimalNumber &&
            tokens[_i + 1] && tokens[_i + 1].type === TokenType.FullStop &&
            tokens[_i + 2] && tokens[_i + 2].type === TokenType.DecimalNumber
        ) return (tokens[_i].number_l = 3, tokens[_i].number_l); // 10.10

        return fail(tokens[_i]);
    }

    function getNumber() {
        var s = '',
            startPos = pos,
            l = tokens[pos].number_l;

        for (var i = 0; i < l; i++) {
            s += tokens[pos + i].value;
        }

        pos += l;

        return needInfo?
                [{ ln: tokens[startPos].ln }, CSSPNodeType.NumberType, s] :
                [CSSPNodeType.NumberType, s];
    }

    // node: Operator
    function checkOperator(_i) {
        if (_i < tokens.length &&
            (tokens[_i].type === TokenType.Solidus ||
            tokens[_i].type === TokenType.Comma ||
            tokens[_i].type === TokenType.Colon ||
            tokens[_i].type === TokenType.EqualsSign)) return 1;

        return fail(tokens[_i]);
    }

    function getOperator() {
        return needInfo?
                [{ ln: tokens[pos].ln }, CSSPNodeType.OperatorType, tokens[pos++].value] :
                [CSSPNodeType.OperatorType, tokens[pos++].value];
    }

    // node: Percentage
    function checkPercentage(_i) {
        var x = checkNumber(_i);

        if (!x || (x && _i + x >= tokens.length)) return fail(tokens[_i]);

        if (tokens[_i + x].type === TokenType.PercentSign) return x + 1;

        return fail(tokens[_i]);
    }

    function getPercentage() {
        var startPos = pos,
            n = getNumber();

        pos++;

        return needInfo?
                [{ ln: tokens[startPos].ln }, CSSPNodeType.PercentageType, n] :
                [CSSPNodeType.PercentageType, n];
    }

//progid = sc*:s0 seq('progid:DXImageTransform.Microsoft.'):x letter+:y '(' (m_string | m_comment | ~')' char)+:z ')' sc*:s1
//                -> this.concat([#progid], s0, [[#raw, x + y.join('') + '(' + z.join('') + ')']], s1),
    function checkProgid(_i) {
        var start = _i,
            l,
            x;

        if (l = checkSC(_i)) _i += l;

        if ((x = joinValues2(_i, 6)) === 'progid:DXImageTransform.Microsoft.') {
            _start = _i;
            _i += 6;
        } else return fail(tokens[_i - 1]);

        if (l = checkIdent(_i)) _i += l;
        else return fail(tokens[_i]);

        if (l = checkSC(_i)) _i += l;

        if (tokens[_i].type === TokenType.LeftParenthesis) {
            tokens[start].progid_end = tokens[_i].right;
            _i = tokens[_i].right + 1;
        } else return fail(tokens[_i]);

        if (l = checkSC(_i)) _i += l;

        return _i - start;
    }

    function getProgid() {
        var startPos = pos,
            progid_end = tokens[pos].progid_end;

        return (needInfo? [{ ln: tokens[startPos].ln }, CSSPNodeType.ProgidType] : [CSSPNodeType.ProgidType])
                .concat(getSC())
                .concat([_getProgid(progid_end)])
                .concat(getSC());
    }

    function _getProgid(progid_end) {
        var startPos = pos,
            x = joinValues(pos, progid_end);

        pos = progid_end + 1;

        return needInfo?
                [{ ln: tokens[startPos].ln }, CSSPNodeType.RawType, x] :
                [CSSPNodeType.RawType, x];
    }

//property = ident:x sc*:s0 -> this.concat([#property, x], s0)
    function checkProperty(_i) {
        var start = _i,
            l;

        if (l = checkIdent(_i)) _i += l;
        else return fail(tokens[_i]);

        if (l = checkSC(_i)) _i += l;
        return _i - start;
    }

    function getProperty() {
        var startPos = pos;

        return (needInfo?
                [{ ln: tokens[startPos].ln }, CSSPNodeType.PropertyType, getIdent()] :
                [CSSPNodeType.PropertyType, getIdent()])
            .concat(getSC());
    }

    function checkPseudo(_i) {
        return checkPseudoe(_i) ||
               checkPseudoc(_i);
    }

    function getPseudo() {
        if (checkPseudoe(pos)) return getPseudoe();
        if (checkPseudoc(pos)) return getPseudoc();
    }

    function checkPseudoe(_i) {
        var l;

        if (tokens[_i++].type !== TokenType.Colon) return fail(tokens[_i - 1]);

        if (tokens[_i++].type !== TokenType.Colon) return fail(tokens[_i - 1]);

        if (l = checkIdent(_i)) return l + 2;

        return fail(tokens[_i]);
    }

    function getPseudoe() {
        var startPos = pos;

        pos += 2;

        return needInfo?
                [{ ln: tokens[startPos].ln }, CSSPNodeType.PseudoeType, getIdent()] :
                [CSSPNodeType.PseudoeType, getIdent()];
    }

//pseudoc = ':' (funktion | ident):x -> [#pseudoc, x]
    function checkPseudoc(_i) {
        var l;

        if (tokens[_i++].type !== TokenType.Colon) return fail(tokens[_i - 1]);

        if ((l = checkFunktion(_i)) || (l = checkIdent(_i))) return l + 1;

        return fail(tokens[_i]);
    }

    function getPseudoc() {
        var startPos = pos;

        pos++;

        return needInfo?
                [{ ln: tokens[startPos].ln }, CSSPNodeType.PseudocType, checkFunktion(pos)? getFunktion() : getIdent()] :
                [CSSPNodeType.PseudocType, checkFunktion(pos)? getFunktion() : getIdent()];
    }

    //ruleset = selector*:x block:y -> this.concat([#ruleset], x, [y])
    function checkRuleset(_i) {
        var start = _i,
            l;

        if (tokens[start].ruleset_l !== undefined) return tokens[start].ruleset_l;

        while (l = checkSelector(_i)) {
            _i += l;
        }

        if (l = checkBlock(_i)) _i += l;
        else return fail(tokens[_i]);

        tokens[start].ruleset_l = _i - start;

        return _i - start;
    }

    function getRuleset() {
        var ruleset = needInfo? [{ ln: tokens[pos].ln }, CSSPNodeType.RulesetType] : [CSSPNodeType.RulesetType];

        while (!checkBlock(pos)) {
            ruleset.push(getSelector());
        }

        ruleset.push(getBlock());

        return ruleset;
    }

    // node: S
    function checkS(_i) {
        if (tokens[_i].ws) return tokens[_i].ws_last - _i + 1;

        return fail(tokens[_i]);
    }

    function getS() {
        var startPos = pos,
            s = joinValues(pos, tokens[pos].ws_last);

        pos = tokens[pos].ws_last + 1;

        return needInfo? [{ ln: tokens[startPos].ln }, CSSPNodeType.SType, s] : [CSSPNodeType.SType, s];
    }

    function checkSC(_i) {
        var l,
            lsc = 0;

        while (_i < tokens.length) {
            if (!(l = checkS(_i)) && !(l = checkComment(_i))) break;
            _i += l;
            lsc += l;
        }

        if (lsc) return lsc;

        if (_i >= tokens.length) return fail(tokens[tokens.length - 1]);

        return fail(tokens[_i]);
    }

    function getSC() {
        var sc = [];

        while (pos < tokens.length) {
            if (checkS(pos)) sc.push(getS());
            else if (checkComment(pos)) sc.push(getComment());
            else break;
        }

        return sc;
    }

    //selector = (simpleselector | delim)+:x -> this.concat([#selector], x)
    function checkSelector(_i) {
        var start = _i,
            l;

        if (_i < tokens.length) {
            while (l = checkSimpleselector(_i) || checkDelim(_i)) {
                _i += l;
            }

            tokens[start].selector_end = _i - 1;

            return _i - start;
        }
    }

    function getSelector() {
        var selector = needInfo? [{ ln: tokens[pos].ln }, CSSPNodeType.SelectorType] : [CSSPNodeType.SelectorType],
            selector_end = tokens[pos].selector_end;

        while (pos <= selector_end) {
            selector.push(checkDelim(pos) ? getDelim() : getSimpleSelector());
        }

        return selector;
    }

    // node: Shash
    function checkShash(_i) {
        if (tokens[_i].type !== TokenType.NumberSign) return fail(tokens[_i]);

        var l = checkNmName(_i + 1);

        if (l) return l + 1;

        return fail(tokens[_i]);
    }

    function getShash() {
        var startPos = pos;

        pos++;

        return needInfo?
                [{ ln: tokens[startPos].ln }, CSSPNodeType.ShashType, getNmName()] :
                [CSSPNodeType.ShashType, getNmName()];
    }

//simpleselector = (nthselector | combinator | attrib | pseudo | clazz | shash | any | sc | namespace)+:x -> this.concatContent([#simpleselector], [x])
    function checkSimpleselector(_i) {
        var start = _i,
            l;

        while (_i < tokens.length) {
            if (l = _checkSimpleSelector(_i)) _i += l;
            else break;
        }

        if (_i - start) return _i - start;

        if (_i >= tokens.length) return fail(tokens[tokens.length - 1]);

        return fail(tokens[_i]);
    }

    function _checkSimpleSelector(_i) {
        return checkNthselector(_i) ||
               checkCombinator(_i) ||
               checkAttrib(_i) ||
               checkPseudo(_i) ||
               checkClazz(_i) ||
               checkShash(_i) ||
               checkAny(_i) ||
               checkSC(_i) ||
               checkNamespace(_i);
    }

    function getSimpleSelector() {
        var ss = needInfo? [{ ln: tokens[pos].ln }, CSSPNodeType.SimpleselectorType] : [CSSPNodeType.SimpleselectorType],
            t;

        while (pos < tokens.length && _checkSimpleSelector(pos)) {
            t = _getSimpleSelector();

            if ((needInfo && typeof t[1] === 'string') || typeof t[0] === 'string') ss.push(t);
            else ss = ss.concat(t);
        }

        return ss;
    }

    function _getSimpleSelector() {
        if (checkNthselector(pos)) return getNthselector();
        else if (checkCombinator(pos)) return getCombinator();
        else if (checkAttrib(pos)) return getAttrib();
        else if (checkPseudo(pos)) return getPseudo();
        else if (checkClazz(pos)) return getClazz();
        else if (checkShash(pos)) return getShash();
        else if (checkAny(pos)) return getAny();
        else if (checkSC(pos)) return getSC();
        else if (checkNamespace(pos)) return getNamespace();
    }

    // node: String
    function checkString(_i) {
        if (_i < tokens.length &&
            (tokens[_i].type === TokenType.StringSQ || tokens[_i].type === TokenType.StringDQ)
        ) return 1;

        return fail(tokens[_i]);
    }

    function getString() {
        var startPos = pos;

        return needInfo?
                [{ ln: tokens[startPos].ln }, CSSPNodeType.StringType, tokens[pos++].value] :
                [CSSPNodeType.StringType, tokens[pos++].value];
    }

    //stylesheet = (cdo | cdc | sc | statement)*:x -> this.concat([#stylesheet], x)
    function checkStylesheet(_i) {
        var start = _i,
            l;

        while (_i < tokens.length) {
            if (l = checkSC(_i)) _i += l;
            else {
                currentBlockLN = tokens[_i].ln;
                if (l = checkAtrule(_i)) _i += l;
                else if (l = checkRuleset(_i)) _i += l;
                else if (l = checkUnknown(_i)) _i += l;
                else throwError();
            }
        }

        return _i - start;
    }

    function getStylesheet(_i) {
        var t,
            stylesheet = needInfo? [{ ln: tokens[pos].ln }, CSSPNodeType.StylesheetType] : [CSSPNodeType.StylesheetType];

        while (pos < tokens.length) {
            if (checkSC(pos)) stylesheet = stylesheet.concat(getSC());
            else {
                currentBlockLN = tokens[pos].ln;
                if (checkRuleset(pos)) stylesheet.push(getRuleset());
                else if (checkAtrule(pos)) stylesheet.push(getAtrule());
                else if (checkUnknown(pos)) stylesheet.push(getUnknown());
                else throwError();
            }
        }

        return stylesheet;
    }

//tset = vhash | any | sc | operator
    function checkTset(_i) {
        return checkVhash(_i) ||
               checkAny(_i) ||
               checkSC(_i) ||
               checkOperator(_i);
    }

    function getTset() {
        if (checkVhash(pos)) return getVhash();
        else if (checkAny(pos)) return getAny();
        else if (checkSC(pos)) return getSC();
        else if (checkOperator(pos)) return getOperator();
    }

    function checkTsets(_i) {
        var start = _i,
            l;

        while (l = checkTset(_i)) {
            _i += l;
        }

        return _i - start;
    }

    function getTsets() {
        var tsets = [],
            x;

        while (x = getTset()) {
            if ((needInfo && typeof x[1] === 'string') || typeof x[0] === 'string') tsets.push(x);
            else tsets = tsets.concat(x);
        }

        return tsets;
    }

    // node: Unary
    function checkUnary(_i) {
        if (_i < tokens.length &&
            (tokens[_i].type === TokenType.HyphenMinus ||
            tokens[_i].type === TokenType.PlusSign)
        ) return 1;

        return fail(tokens[_i]);
    }

    function getUnary() {
        var startPos = pos;

        return needInfo?
                [{ ln: tokens[startPos].ln }, CSSPNodeType.UnaryType, tokens[pos++].value] :
                [CSSPNodeType.UnaryType, tokens[pos++].value];
    }

    // node: Unknown
    function checkUnknown(_i) {
        if (_i < tokens.length && tokens[_i].type === TokenType.CommentSL) return 1;

        return fail(tokens[_i]);
    }

    function getUnknown() {
        var startPos = pos;

        return needInfo?
                [{ ln: tokens[startPos].ln }, CSSPNodeType.UnknownType, tokens[pos++].value] :
                [CSSPNodeType.UnknownType, tokens[pos++].value];
    }

//    uri = seq('url(') sc*:s0 string:x sc*:s1 ')' -> this.concat([#uri], s0, [x], s1)
//        | seq('url(') sc*:s0 (~')' ~m_w char)*:x sc*:s1 ')' -> this.concat([#uri], s0, [[#raw, x.join('')]], s1),
    function checkUri(_i) {
        var start = _i,
            l;

        if (_i < tokens.length && tokens[_i++].value !== 'url') return fail(tokens[_i - 1]);

        if (!tokens[_i] || tokens[_i].type !== TokenType.LeftParenthesis) return fail(tokens[_i]);

        return tokens[_i].right - start + 1;
    }

    function getUri() {
        var startPos = pos,
            uriExcluding = {};

        pos += 2;

        uriExcluding[TokenType.Space] = 1;
        uriExcluding[TokenType.Tab] = 1;
        uriExcluding[TokenType.Newline] = 1;
        uriExcluding[TokenType.LeftParenthesis] = 1;
        uriExcluding[TokenType.RightParenthesis] = 1;

        if (checkUri1(pos)) {
            var uri = (needInfo? [{ ln: tokens[startPos].ln }, CSSPNodeType.UriType] : [CSSPNodeType.UriType])
                        .concat(getSC())
                        .concat([getString()])
                        .concat(getSC());

            pos++;

            return uri;
        } else {
            var uri = (needInfo? [{ ln: tokens[startPos].ln }, CSSPNodeType.UriType] : [CSSPNodeType.UriType])
                        .concat(getSC()),
                l = checkExcluding(uriExcluding, pos),
                raw = needInfo?
                        [{ ln: tokens[pos].ln }, CSSPNodeType.RawType, joinValues(pos, pos + l)] :
                        [CSSPNodeType.RawType, joinValues(pos, pos + l)];

            uri.push(raw);

            pos += l + 1;

            uri = uri.concat(getSC());

            pos++;

            return uri;
        }
    }

    function checkUri1(_i) {
        var start = _i,
            l = checkSC(_i);

        if (l) _i += l;

        if (tokens[_i].type !== TokenType.StringDQ && tokens[_i].type !== TokenType.StringSQ) return fail(tokens[_i]);

        _i++;

        if (l = checkSC(_i)) _i += l;

        return _i - start;
    }

    // value = (sc | vhash | any | block | atkeyword | operator | important)+:x -> this.concat([#value], x)
    function checkValue(_i) {
        var start = _i,
            l;

        while (_i < tokens.length) {
            if (l = _checkValue(_i)) _i += l;
            else break;
        }

        if (_i - start) return _i - start;

        return fail(tokens[_i]);
    }

    function _checkValue(_i) {
        return checkSC(_i) ||
               checkVhash(_i) ||
               checkAny(_i) ||
               checkBlock(_i) ||
               checkAtkeyword(_i) ||
               checkOperator(_i) ||
               checkImportant(_i);
    }

    function getValue() {
        var ss = needInfo? [{ ln: tokens[pos].ln }, CSSPNodeType.ValueType] : [CSSPNodeType.ValueType],
            t;

        while (pos < tokens.length && _checkValue(pos)) {
            t = _getValue();

            if ((needInfo && typeof t[1] === 'string') || typeof t[0] === 'string') ss.push(t);
            else ss = ss.concat(t);
        }

        return ss;
    }

    function _getValue() {
        if (checkSC(pos)) return getSC();
        else if (checkVhash(pos)) return getVhash();
        else if (checkAny(pos)) return getAny();
        else if (checkBlock(pos)) return getBlock();
        else if (checkAtkeyword(pos)) return getAtkeyword();
        else if (checkOperator(pos)) return getOperator();
        else if (checkImportant(pos)) return getImportant();
    }

    // node: Vhash
    function checkVhash(_i) {
        if (_i >= tokens.length || tokens[_i].type !== TokenType.NumberSign) return fail(tokens[_i]);

        var l = checkNmName2(_i + 1);

        if (l) return l + 1;

        return fail(tokens[_i]);
    }

    function getVhash() {
        var startPos = pos;

        pos++;

        return needInfo?
                [{ ln: tokens[startPos].ln }, CSSPNodeType.VhashType, getNmName2()] :
                [CSSPNodeType.VhashType, getNmName2()];
    }

    function checkNmName(_i) {
        var start = _i;

        // start char / word
        if (tokens[_i].type === TokenType.HyphenMinus ||
            tokens[_i].type === TokenType.LowLine ||
            tokens[_i].type === TokenType.Identifier ||
            tokens[_i].type === TokenType.DecimalNumber) _i++;
        else return fail(tokens[_i]);

        for (; _i < tokens.length; _i++) {
            if (tokens[_i].type !== TokenType.HyphenMinus &&
                tokens[_i].type !== TokenType.LowLine &&
                tokens[_i].type !== TokenType.Identifier &&
                tokens[_i].type !== TokenType.DecimalNumber) break;
        }

        tokens[start].nm_name_last = _i - 1;

        return _i - start;
    }

    function getNmName() {
        var s = joinValues(pos, tokens[pos].nm_name_last);

        pos = tokens[pos].nm_name_last + 1;

        return s;
    }

    function checkNmName2(_i) {
        var start = _i;

        if (tokens[_i].type === TokenType.Identifier) return 1;
        else if (tokens[_i].type !== TokenType.DecimalNumber) return fail(tokens[_i]);

        _i++;

        if (!tokens[_i] || tokens[_i].type !== TokenType.Identifier) return 1;

        return 2;
    }

    function getNmName2() {
        var s = tokens[pos].value;

        if (tokens[pos++].type === TokenType.DecimalNumber &&
                pos < tokens.length &&
                tokens[pos].type === TokenType.Identifier
        ) s += tokens[pos++].value;

        return s;
    }

    function checkExcluding(exclude, _i) {
        var start = _i;

        while(_i < tokens.length) {
            if (exclude[tokens[_i++].type]) break;
        }

        return _i - start - 2;
    }

    function joinValues(start, finish) {
        var s = '';

        for (var i = start; i < finish + 1; i++) {
            s += tokens[i].value;
        }

        return s;
    }

    function joinValues2(start, num) {
        if (start + num - 1 >= tokens.length) return;

        var s = '';

        for (var i = 0; i < num; i++) {
            s += tokens[start + i].value;
        }

        return s;
    }

    function markSC() {
        var ws = -1, // whitespaces
            sc = -1, // ws and comments
            t;

        for (var i = 0; i < tokens.length; i++) {
            t = tokens[i];
            switch (t.type) {
                case TokenType.Space:
                case TokenType.Tab:
                case TokenType.Newline:
                    t.ws = true;
                    t.sc = true;

                    if (ws === -1) ws = i;
                    if (sc === -1) sc = i;

                    break;
                case TokenType.CommentML:
                    if (ws !== -1) {
                        tokens[ws].ws_last = i - 1;
                        ws = -1;
                    }

                    t.sc = true;

                    break;
                default:
                    if (ws !== -1) {
                        tokens[ws].ws_last = i - 1;
                        ws = -1;
                    }

                    if (sc !== -1) {
                        tokens[sc].sc_last = i - 1;
                        sc = -1;
                    }
            }
        }

        if (ws !== -1) tokens[ws].ws_last = i - 1;
        if (sc !== -1) tokens[sc].sc_last = i - 1;
    }

    return function(_tokens, rule, _needInfo) {
        return _getAST(_tokens, rule, _needInfo);
    }

}());
    return function(s, rule, _needInfo) {
        return getCSSPAST(getTokens(s), rule, _needInfo);
    }
}());
exports.srcToCSSP = srcToCSSP;

},{}],37:[function(require,module,exports){
// CSSP

exports.srcToCSSP = require('./gonzales.cssp.node.js').srcToCSSP;

exports.csspToSrc = require('./cssp.translator.node.js').csspToSrc;

exports.csspToTree = function(tree, level) {
    var spaces = dummySpaces(level),
        level = level ? level : 0,
        s = (level ? '\n' + spaces : '') + '[';

    tree.forEach(function(e) {
        if (e.ln === undefined) {
            s += (Array.isArray(e) ? exports.csspToTree(e, level + 1) : ('\'' + e.toString() + '\'')) + ', ';
        }
    });

    return s.substr(0, s.length - 2) + ']';
}

function dummySpaces(num) {
    return '                                                  '.substr(0, num * 2);
}

},{"./cssp.translator.node.js":35,"./gonzales.cssp.node.js":36}],38:[function(require,module,exports){
(function () {
	'use strict';

	var crc32 = require('crc32'),
		deflate = require('deflate-js'),
		// magic numbers marking this file as GZIP
		ID1 = 0x1F,
		ID2 = 0x8B,
		compressionMethods = {
			'deflate': 8
		},
		possibleFlags = {
			'FTEXT': 0x01,
			'FHCRC': 0x02,
			'FEXTRA': 0x04,
			'FNAME': 0x08,
			'FCOMMENT': 0x10
		},
		osMap = {
			'fat': 0, // FAT file system (DOS, OS/2, NT) + PKZIPW 2.50 VFAT, NTFS
			'amiga': 1, // Amiga
			'vmz': 2, // VMS (VAX or Alpha AXP)
			'unix': 3, // Unix
			'vm/cms': 4, // VM/CMS
			'atari': 5, // Atari
			'hpfs': 6, // HPFS file system (OS/2, NT 3.x)
			'macintosh': 7, // Macintosh
			'z-system': 8, // Z-System
			'cplm': 9, // CP/M
			'tops-20': 10, // TOPS-20
			'ntfs': 11, // NTFS file system (NT)
			'qdos': 12, // SMS/QDOS
			'acorn': 13, // Acorn RISC OS
			'vfat': 14, // VFAT file system (Win95, NT)
			'vms': 15, // MVS (code also taken for PRIMOS)
			'beos': 16, // BeOS (BeBox or PowerMac)
			'tandem': 17, // Tandem/NSK
			'theos': 18 // THEOS
		},
		os = 'unix',
		DEFAULT_LEVEL = 6;

	function putByte(n, arr) {
		arr.push(n & 0xFF);
	}

	// LSB first
	function putShort(n, arr) {
		arr.push(n & 0xFF);
		arr.push(n >>> 8);
	}

	// LSB first
	function putLong(n, arr) {
		putShort(n & 0xffff, arr);
		putShort(n >>> 16, arr);
	}

	function putString(s, arr) {
		var i, len = s.length;
		for (i = 0; i < len; i += 1) {
			putByte(s.charCodeAt(i), arr);
		}
	}

	function readByte(arr) {
		return arr.shift();
	}

	function readShort(arr) {
		return arr.shift() | (arr.shift() << 8);
	}

	function readLong(arr) {
		var n1 = readShort(arr),
			n2 = readShort(arr);

		// JavaScript can't handle bits in the position 32
		// we'll emulate this by removing the left-most bit (if it exists)
		// and add it back in via multiplication, which does work
		if (n2 > 32768) {
			n2 -= 32768;

			return ((n2 << 16) | n1) + 32768 * Math.pow(2, 16);
		}

		return (n2 << 16) | n1;
	}

	function readString(arr) {
		var charArr = [];

		// turn all bytes into chars until the terminating null
		while (arr[0] !== 0) {
			charArr.push(String.fromCharCode(arr.shift()));
		}

		// throw away terminating null
		arr.shift();

		// join all characters into a cohesive string
		return charArr.join('');
	}

	/*
	 * Reads n number of bytes and return as an array.
	 *
	 * @param arr- Array of bytes to read from
	 * @param n- Number of bytes to read
	 */
	function readBytes(arr, n) {
		var i, ret = [];
		for (i = 0; i < n; i += 1) {
			ret.push(arr.shift());
		}

		return ret;
	}

	/*
	 * ZIPs a file in GZIP format. The format is as given by the spec, found at:
	 * http://www.gzip.org/zlib/rfc-gzip.html
	 *
	 * Omitted parts in this implementation:
	 */
	function zip(data, options) {
		var flags = 0,
			level,
			crc, out = [];

		if (!options) {
			options = {};
		}
		level = options.level || DEFAULT_LEVEL;

		if (typeof data === 'string') {
			data = Array.prototype.map.call(data, function (char) {
				return char.charCodeAt(0);
			});
		}

		// magic number marking this file as GZIP
		putByte(ID1, out);
		putByte(ID2, out);

		putByte(compressionMethods['deflate'], out);

		if (options.name) {
			flags |= possibleFlags['FNAME'];
		}

		putByte(flags, out);
		putLong(options.timestamp || parseInt(Date.now() / 1000, 10), out);

		// put deflate args (extra flags)
		if (level === 1) {
			// fastest algorithm
			putByte(4, out);
		} else if (level === 9) {
			// maximum compression (fastest algorithm)
			putByte(2, out);
		} else {
			putByte(0, out);
		}

		// OS identifier
		putByte(osMap[os], out);

		if (options.name) {
			// ignore the directory part
			putString(options.name.substring(options.name.lastIndexOf('/') + 1), out);

			// terminating null
			putByte(0, out);
		}

		deflate.deflate(data, level).forEach(function (byte) {
			putByte(byte, out);
		});

		putLong(parseInt(crc32(data), 16), out);
		putLong(data.length, out);

		return out;
	}

	function unzip(data, options) {
		// start with a copy of the array
		var arr = Array.prototype.slice.call(data, 0),
			t,
			compressionMethod,
			flags,
			mtime,
			xFlags,
			key,
			os,
			crc,
			size,
			res;

		// check the first two bytes for the magic numbers
		if (readByte(arr) !== ID1 || readByte(arr) !== ID2) {
			throw 'Not a GZIP file';
		}

		t = readByte(arr);
		t = Object.keys(compressionMethods).some(function (key) {
			compressionMethod = key;
			return compressionMethods[key] === t;
		});

		if (!t) {
			throw 'Unsupported compression method';
		}

		flags = readByte(arr);
		mtime = readLong(arr);
		xFlags = readByte(arr);
		t = readByte(arr);
		Object.keys(osMap).some(function (key) {
			if (osMap[key] === t) {
				os = key;
				return true;
			}
		});

		// just throw away the bytes for now
		if (flags & possibleFlags['FEXTRA']) {
			t = readShort(arr);
			readBytes(arr, t);
		}

		// just throw away for now
		if (flags & possibleFlags['FNAME']) {
			readString(arr);
		}

		// just throw away for now
		if (flags & possibleFlags['FCOMMENT']) {
			readString(arr);
		}

		// just throw away for now
		if (flags & possibleFlags['FHCRC']) {
			readShort(arr);
		}

		if (compressionMethod === 'deflate') {
			// give deflate everything but the last 8 bytes
			// the last 8 bytes are for the CRC32 checksum and filesize
			res = deflate.inflate(arr.splice(0, arr.length - 8));
		}

		if (flags & possibleFlags['FTEXT']) {
			res = Array.prototype.map.call(res, function (byte) {
				return String.fromCharCode(byte);
			}).join('');
		}

		crc = readLong(arr);
		if (crc !== parseInt(crc32(res), 16)) {
			throw 'Checksum does not match';
		}

		size = readLong(arr);
		if (size !== res.length) {
			throw 'Size of decompressed file not correct';
		}

		return res;
	}

	module.exports = {
		zip: zip,
		unzip: unzip,
		get DEFAULT_LEVEL() {
			return DEFAULT_LEVEL;
		}
	};
}());

},{"crc32":39,"deflate-js":40}],39:[function(require,module,exports){
(function () {
	'use strict';

	var table = [],
		poly = 0xEDB88320; // reverse polynomial

	// build the table
	function makeTable() {
		var c, n, k;

		for (n = 0; n < 256; n += 1) {
			c = n;
			for (k = 0; k < 8; k += 1) {
				if (c & 1) {
					c = poly ^ (c >>> 1);
				} else {
					c = c >>> 1;
				}
			}
			table[n] = c >>> 0;
		}
	}

	function strToArr(str) {
		// sweet hack to turn string into a 'byte' array
		return Array.prototype.map.call(str, function (c) {
			return c.charCodeAt(0);
		});
	}

	/*
	 * Compute CRC of array directly.
	 *
	 * This is slower for repeated calls, so append mode is not supported.
	 */
	function crcDirect(arr) {
		var crc = -1, // initial contents of LFBSR
			i, j, l, temp;

		for (i = 0, l = arr.length; i < l; i += 1) {
			temp = (crc ^ arr[i]) & 0xff;

			// read 8 bits one at a time
			for (j = 0; j < 8; j += 1) {
				if ((temp & 1) === 1) {
					temp = (temp >>> 1) ^ poly;
				} else {
					temp = (temp >>> 1);
				}
			}
			crc = (crc >>> 8) ^ temp;
		}

		// flip bits
		return crc ^ -1;
	}

	/*
	 * Compute CRC with the help of a pre-calculated table.
	 *
	 * This supports append mode, if the second parameter is set.
	 */
	function crcTable(arr, append) {
		var crc, i, l;

		// if we're in append mode, don't reset crc
		// if arr is null or undefined, reset table and return
		if (typeof crcTable.crc === 'undefined' || !append || !arr) {
			crcTable.crc = 0 ^ -1;

			if (!arr) {
				return;
			}
		}

		// store in temp variable for minor speed gain
		crc = crcTable.crc;

		for (i = 0, l = arr.length; i < l; i += 1) {
			crc = (crc >>> 8) ^ table[(crc ^ arr[i]) & 0xff];
		}

		crcTable.crc = crc;

		return crc ^ -1;
	}

	// build the table
	// this isn't that costly, and most uses will be for table assisted mode
	makeTable();

	module.exports = function (val, direct) {
		var val = (typeof val === 'string') ? strToArr(val) : val,
			ret = direct ? crcDirect(val) : crcTable(val);

		// convert to 2's complement hex
		return (ret >>> 0).toString(16);
	};
	module.exports.direct = crcDirect;
	module.exports.table = crcTable;
}());

},{}],40:[function(require,module,exports){
(function () {
	'use strict';

	module.exports = {
		'inflate': require('./lib/rawinflate.js'),
		'deflate': require('./lib/rawdeflate.js')
	};
}());

},{"./lib/rawdeflate.js":41,"./lib/rawinflate.js":42}],41:[function(require,module,exports){
/*
 * $Id: rawdeflate.js,v 0.3 2009/03/01 19:05:05 dankogai Exp dankogai $
 *
 * Original:
 *   http://www.onicos.com/staff/iz/amuse/javascript/expert/deflate.txt
 */

/* Copyright (C) 1999 Masanao Izumo <iz@onicos.co.jp>
 * Version: 1.0.1
 * LastModified: Dec 25 1999
 */

/* Interface:
 * data = deflate(src);
 */

(function () {
	/* constant parameters */
	var WSIZE = 32768, // Sliding Window size
		STORED_BLOCK = 0,
		STATIC_TREES = 1,
		DYN_TREES = 2,

	/* for deflate */
		DEFAULT_LEVEL = 6,
		FULL_SEARCH = false,
		INBUFSIZ = 32768, // Input buffer size
		//INBUF_EXTRA = 64, // Extra buffer
		OUTBUFSIZ = 1024 * 8,
		window_size = 2 * WSIZE,
		MIN_MATCH = 3,
		MAX_MATCH = 258,
		BITS = 16,
	// for SMALL_MEM
		LIT_BUFSIZE = 0x2000,
//		HASH_BITS = 13,
	//for MEDIUM_MEM
	//	LIT_BUFSIZE = 0x4000,
	//	HASH_BITS = 14,
	// for BIG_MEM
	//	LIT_BUFSIZE = 0x8000,
		HASH_BITS = 15,
		DIST_BUFSIZE = LIT_BUFSIZE,
		HASH_SIZE = 1 << HASH_BITS,
		HASH_MASK = HASH_SIZE - 1,
		WMASK = WSIZE - 1,
		NIL = 0, // Tail of hash chains
		TOO_FAR = 4096,
		MIN_LOOKAHEAD = MAX_MATCH + MIN_MATCH + 1,
		MAX_DIST = WSIZE - MIN_LOOKAHEAD,
		SMALLEST = 1,
		MAX_BITS = 15,
		MAX_BL_BITS = 7,
		LENGTH_CODES = 29,
		LITERALS = 256,
		END_BLOCK = 256,
		L_CODES = LITERALS + 1 + LENGTH_CODES,
		D_CODES = 30,
		BL_CODES = 19,
		REP_3_6 = 16,
		REPZ_3_10 = 17,
		REPZ_11_138 = 18,
		HEAP_SIZE = 2 * L_CODES + 1,
		H_SHIFT = parseInt((HASH_BITS + MIN_MATCH - 1) / MIN_MATCH, 10),

	/* variables */
		free_queue,
		qhead,
		qtail,
		initflag,
		outbuf = null,
		outcnt,
		outoff,
		complete,
		window,
		d_buf,
		l_buf,
		prev,
		bi_buf,
		bi_valid,
		block_start,
		ins_h,
		hash_head,
		prev_match,
		match_available,
		match_length,
		prev_length,
		strstart,
		match_start,
		eofile,
		lookahead,
		max_chain_length,
		max_lazy_match,
		compr_level,
		good_match,
		nice_match,
		dyn_ltree,
		dyn_dtree,
		static_ltree,
		static_dtree,
		bl_tree,
		l_desc,
		d_desc,
		bl_desc,
		bl_count,
		heap,
		heap_len,
		heap_max,
		depth,
		length_code,
		dist_code,
		base_length,
		base_dist,
		flag_buf,
		last_lit,
		last_dist,
		last_flags,
		flags,
		flag_bit,
		opt_len,
		static_len,
		deflate_data,
		deflate_pos;

	if (LIT_BUFSIZE > INBUFSIZ) {
		console.error("error: INBUFSIZ is too small");
	}
	if ((WSIZE << 1) > (1 << BITS)) {
		console.error("error: WSIZE is too large");
	}
	if (HASH_BITS > BITS - 1) {
		console.error("error: HASH_BITS is too large");
	}
	if (HASH_BITS < 8 || MAX_MATCH !== 258) {
		console.error("error: Code too clever");
	}

	/* objects (deflate) */

	function DeflateCT() {
		this.fc = 0; // frequency count or bit string
		this.dl = 0; // father node in Huffman tree or length of bit string
	}

	function DeflateTreeDesc() {
		this.dyn_tree = null; // the dynamic tree
		this.static_tree = null; // corresponding static tree or NULL
		this.extra_bits = null; // extra bits for each code or NULL
		this.extra_base = 0; // base index for extra_bits
		this.elems = 0; // max number of elements in the tree
		this.max_length = 0; // max bit length for the codes
		this.max_code = 0; // largest code with non zero frequency
	}

	/* Values for max_lazy_match, good_match and max_chain_length, depending on
	 * the desired pack level (0..9). The values given below have been tuned to
	 * exclude worst case performance for pathological files. Better values may be
	 * found for specific files.
	 */
	function DeflateConfiguration(a, b, c, d) {
		this.good_length = a; // reduce lazy search above this match length
		this.max_lazy = b; // do not perform lazy search above this match length
		this.nice_length = c; // quit search above this match length
		this.max_chain = d;
	}

	function DeflateBuffer() {
		this.next = null;
		this.len = 0;
		this.ptr = []; // new Array(OUTBUFSIZ); // ptr.length is never read
		this.off = 0;
	}

	/* constant tables */
	var extra_lbits = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
	var extra_dbits = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
	var extra_blbits = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 7];
	var bl_order = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
	var configuration_table = [
		new DeflateConfiguration(0, 0, 0, 0),
		new DeflateConfiguration(4, 4, 8, 4),
		new DeflateConfiguration(4, 5, 16, 8),
		new DeflateConfiguration(4, 6, 32, 32),
		new DeflateConfiguration(4, 4, 16, 16),
		new DeflateConfiguration(8, 16, 32, 32),
		new DeflateConfiguration(8, 16, 128, 128),
		new DeflateConfiguration(8, 32, 128, 256),
		new DeflateConfiguration(32, 128, 258, 1024),
		new DeflateConfiguration(32, 258, 258, 4096)
	];


	/* routines (deflate) */

	function deflate_start(level) {
		var i;

		if (!level) {
			level = DEFAULT_LEVEL;
		} else if (level < 1) {
			level = 1;
		} else if (level > 9) {
			level = 9;
		}

		compr_level = level;
		initflag = false;
		eofile = false;
		if (outbuf !== null) {
			return;
		}

		free_queue = qhead = qtail = null;
		outbuf = []; // new Array(OUTBUFSIZ); // outbuf.length never called
		window = []; // new Array(window_size); // window.length never called
		d_buf = []; // new Array(DIST_BUFSIZE); // d_buf.length never called
		l_buf = []; // new Array(INBUFSIZ + INBUF_EXTRA); // l_buf.length never called
		prev = []; // new Array(1 << BITS); // prev.length never called

		dyn_ltree = [];
		for (i = 0; i < HEAP_SIZE; i++) {
			dyn_ltree[i] = new DeflateCT();
		}
		dyn_dtree = [];
		for (i = 0; i < 2 * D_CODES + 1; i++) {
			dyn_dtree[i] = new DeflateCT();
		}
		static_ltree = [];
		for (i = 0; i < L_CODES + 2; i++) {
			static_ltree[i] = new DeflateCT();
		}
		static_dtree = [];
		for (i = 0; i < D_CODES; i++) {
			static_dtree[i] = new DeflateCT();
		}
		bl_tree = [];
		for (i = 0; i < 2 * BL_CODES + 1; i++) {
			bl_tree[i] = new DeflateCT();
		}
		l_desc = new DeflateTreeDesc();
		d_desc = new DeflateTreeDesc();
		bl_desc = new DeflateTreeDesc();
		bl_count = []; // new Array(MAX_BITS+1); // bl_count.length never called
		heap = []; // new Array(2*L_CODES+1); // heap.length never called
		depth = []; // new Array(2*L_CODES+1); // depth.length never called
		length_code = []; // new Array(MAX_MATCH-MIN_MATCH+1); // length_code.length never called
		dist_code = []; // new Array(512); // dist_code.length never called
		base_length = []; // new Array(LENGTH_CODES); // base_length.length never called
		base_dist = []; // new Array(D_CODES); // base_dist.length never called
		flag_buf = []; // new Array(parseInt(LIT_BUFSIZE / 8, 10)); // flag_buf.length never called
	}

	function deflate_end() {
		free_queue = qhead = qtail = null;
		outbuf = null;
		window = null;
		d_buf = null;
		l_buf = null;
		prev = null;
		dyn_ltree = null;
		dyn_dtree = null;
		static_ltree = null;
		static_dtree = null;
		bl_tree = null;
		l_desc = null;
		d_desc = null;
		bl_desc = null;
		bl_count = null;
		heap = null;
		depth = null;
		length_code = null;
		dist_code = null;
		base_length = null;
		base_dist = null;
		flag_buf = null;
	}

	function reuse_queue(p) {
		p.next = free_queue;
		free_queue = p;
	}

	function new_queue() {
		var p;

		if (free_queue !== null) {
			p = free_queue;
			free_queue = free_queue.next;
		} else {
			p = new DeflateBuffer();
		}
		p.next = null;
		p.len = p.off = 0;

		return p;
	}

	function head1(i) {
		return prev[WSIZE + i];
	}

	function head2(i, val) {
		return (prev[WSIZE + i] = val);
	}

	/* put_byte is used for the compressed output, put_ubyte for the
	 * uncompressed output. However unlzw() uses window for its
	 * suffix table instead of its output buffer, so it does not use put_ubyte
	 * (to be cleaned up).
	 */
	function put_byte(c) {
		outbuf[outoff + outcnt++] = c;
		if (outoff + outcnt === OUTBUFSIZ) {
			qoutbuf();
		}
	}

	/* Output a 16 bit value, lsb first */
	function put_short(w) {
		w &= 0xffff;
		if (outoff + outcnt < OUTBUFSIZ - 2) {
			outbuf[outoff + outcnt++] = (w & 0xff);
			outbuf[outoff + outcnt++] = (w >>> 8);
		} else {
			put_byte(w & 0xff);
			put_byte(w >>> 8);
		}
	}

	/* ==========================================================================
	 * Insert string s in the dictionary and set match_head to the previous head
	 * of the hash chain (the most recent string with same hash key). Return
	 * the previous length of the hash chain.
	 * IN  assertion: all calls to to INSERT_STRING are made with consecutive
	 *    input characters and the first MIN_MATCH bytes of s are valid
	 *    (except for the last MIN_MATCH-1 bytes of the input file).
	 */
	function INSERT_STRING() {
		ins_h = ((ins_h << H_SHIFT) ^ (window[strstart + MIN_MATCH - 1] & 0xff)) & HASH_MASK;
		hash_head = head1(ins_h);
		prev[strstart & WMASK] = hash_head;
		head2(ins_h, strstart);
	}

	/* Send a code of the given tree. c and tree must not have side effects */
	function SEND_CODE(c, tree) {
		send_bits(tree[c].fc, tree[c].dl);
	}

	/* Mapping from a distance to a distance code. dist is the distance - 1 and
	 * must not have side effects. dist_code[256] and dist_code[257] are never
	 * used.
	 */
	function D_CODE(dist) {
		return (dist < 256 ? dist_code[dist] : dist_code[256 + (dist >> 7)]) & 0xff;
	}

	/* ==========================================================================
	 * Compares to subtrees, using the tree depth as tie breaker when
	 * the subtrees have equal frequency. This minimizes the worst case length.
	 */
	function SMALLER(tree, n, m) {
		return tree[n].fc < tree[m].fc || (tree[n].fc === tree[m].fc && depth[n] <= depth[m]);
	}

	/* ==========================================================================
	 * read string data
	 */
	function read_buff(buff, offset, n) {
		var i;
		for (i = 0; i < n && deflate_pos < deflate_data.length; i++) {
			buff[offset + i] = deflate_data[deflate_pos++] & 0xff;
		}
		return i;
	}

	/* ==========================================================================
	 * Initialize the "longest match" routines for a new file
	 */
	function lm_init() {
		var j;

		// Initialize the hash table. */
		for (j = 0; j < HASH_SIZE; j++) {
			// head2(j, NIL);
			prev[WSIZE + j] = 0;
		}
		// prev will be initialized on the fly */

		// Set the default configuration parameters:
		max_lazy_match = configuration_table[compr_level].max_lazy;
		good_match = configuration_table[compr_level].good_length;
		if (!FULL_SEARCH) {
			nice_match = configuration_table[compr_level].nice_length;
		}
		max_chain_length = configuration_table[compr_level].max_chain;

		strstart = 0;
		block_start = 0;

		lookahead = read_buff(window, 0, 2 * WSIZE);
		if (lookahead <= 0) {
			eofile = true;
			lookahead = 0;
			return;
		}
		eofile = false;
		// Make sure that we always have enough lookahead. This is important
		// if input comes from a device such as a tty.
		while (lookahead < MIN_LOOKAHEAD && !eofile) {
			fill_window();
		}

		// If lookahead < MIN_MATCH, ins_h is garbage, but this is
		// not important since only literal bytes will be emitted.
		ins_h = 0;
		for (j = 0; j < MIN_MATCH - 1; j++) {
			// UPDATE_HASH(ins_h, window[j]);
			ins_h = ((ins_h << H_SHIFT) ^ (window[j] & 0xff)) & HASH_MASK;
		}
	}

	/* ==========================================================================
	 * Set match_start to the longest match starting at the given string and
	 * return its length. Matches shorter or equal to prev_length are discarded,
	 * in which case the result is equal to prev_length and match_start is
	 * garbage.
	 * IN assertions: cur_match is the head of the hash chain for the current
	 *   string (strstart) and its distance is <= MAX_DIST, and prev_length >= 1
	 */
	function longest_match(cur_match) {
		var chain_length = max_chain_length; // max hash chain length
		var scanp = strstart; // current string
		var matchp; // matched string
		var len; // length of current match
		var best_len = prev_length; // best match length so far

		// Stop when cur_match becomes <= limit. To simplify the code,
		// we prevent matches with the string of window index 0.
		var limit = (strstart > MAX_DIST ? strstart - MAX_DIST : NIL);

		var strendp = strstart + MAX_MATCH;
		var scan_end1 = window[scanp + best_len - 1];
		var scan_end = window[scanp + best_len];

		var i, broke;

		// Do not waste too much time if we already have a good match: */
		if (prev_length >= good_match) {
			chain_length >>= 2;
		}

		// Assert(encoder->strstart <= window_size-MIN_LOOKAHEAD, "insufficient lookahead");

		do {
			// Assert(cur_match < encoder->strstart, "no future");
			matchp = cur_match;

			// Skip to next match if the match length cannot increase
			// or if the match length is less than 2:
			if (window[matchp + best_len] !== scan_end  ||
					window[matchp + best_len - 1] !== scan_end1 ||
					window[matchp] !== window[scanp] ||
					window[++matchp] !== window[scanp + 1]) {
				continue;
			}

			// The check at best_len-1 can be removed because it will be made
			// again later. (This heuristic is not always a win.)
			// It is not necessary to compare scan[2] and match[2] since they
			// are always equal when the other bytes match, given that
			// the hash keys are equal and that HASH_BITS >= 8.
			scanp += 2;
			matchp++;

			// We check for insufficient lookahead only every 8th comparison;
			// the 256th check will be made at strstart+258.
			while (scanp < strendp) {
				broke = false;
				for (i = 0; i < 8; i += 1) {
					scanp += 1;
					matchp += 1;
					if (window[scanp] !== window[matchp]) {
						broke = true;
						break;
					}
				}

				if (broke) {
					break;
				}
			}

			len = MAX_MATCH - (strendp - scanp);
			scanp = strendp - MAX_MATCH;

			if (len > best_len) {
				match_start = cur_match;
				best_len = len;
				if (FULL_SEARCH) {
					if (len >= MAX_MATCH) {
						break;
					}
				} else {
					if (len >= nice_match) {
						break;
					}
				}

				scan_end1 = window[scanp + best_len - 1];
				scan_end = window[scanp + best_len];
			}
		} while ((cur_match = prev[cur_match & WMASK]) > limit && --chain_length !== 0);

		return best_len;
	}

	/* ==========================================================================
	 * Fill the window when the lookahead becomes insufficient.
	 * Updates strstart and lookahead, and sets eofile if end of input file.
	 * IN assertion: lookahead < MIN_LOOKAHEAD && strstart + lookahead > 0
	 * OUT assertions: at least one byte has been read, or eofile is set;
	 *    file reads are performed for at least two bytes (required for the
	 *    translate_eol option).
	 */
	function fill_window() {
		var n, m;

	 // Amount of free space at the end of the window.
		var more = window_size - lookahead - strstart;

		// If the window is almost full and there is insufficient lookahead,
		// move the upper half to the lower one to make room in the upper half.
		if (more === -1) {
			// Very unlikely, but possible on 16 bit machine if strstart == 0
			// and lookahead == 1 (input done one byte at time)
			more--;
		} else if (strstart >= WSIZE + MAX_DIST) {
			// By the IN assertion, the window is not empty so we can't confuse
			// more == 0 with more == 64K on a 16 bit machine.
			// Assert(window_size == (ulg)2*WSIZE, "no sliding with BIG_MEM");

			// System.arraycopy(window, WSIZE, window, 0, WSIZE);
			for (n = 0; n < WSIZE; n++) {
				window[n] = window[n + WSIZE];
			}

			match_start -= WSIZE;
			strstart    -= WSIZE; /* we now have strstart >= MAX_DIST: */
			block_start -= WSIZE;

			for (n = 0; n < HASH_SIZE; n++) {
				m = head1(n);
				head2(n, m >= WSIZE ? m - WSIZE : NIL);
			}
			for (n = 0; n < WSIZE; n++) {
			// If n is not on any hash chain, prev[n] is garbage but
			// its value will never be used.
				m = prev[n];
				prev[n] = (m >= WSIZE ? m - WSIZE : NIL);
			}
			more += WSIZE;
		}
		// At this point, more >= 2
		if (!eofile) {
			n = read_buff(window, strstart + lookahead, more);
			if (n <= 0) {
				eofile = true;
			} else {
				lookahead += n;
			}
		}
	}

	/* ==========================================================================
	 * Processes a new input file and return its compressed length. This
	 * function does not perform lazy evaluationof matches and inserts
	 * new strings in the dictionary only for unmatched strings or for short
	 * matches. It is used only for the fast compression options.
	 */
	function deflate_fast() {
		while (lookahead !== 0 && qhead === null) {
			var flush; // set if current block must be flushed

			// Insert the string window[strstart .. strstart+2] in the
			// dictionary, and set hash_head to the head of the hash chain:
			INSERT_STRING();

			// Find the longest match, discarding those <= prev_length.
			// At this point we have always match_length < MIN_MATCH
			if (hash_head !== NIL && strstart - hash_head <= MAX_DIST) {
				// To simplify the code, we prevent matches with the string
				// of window index 0 (in particular we have to avoid a match
				// of the string with itself at the start of the input file).
				match_length = longest_match(hash_head);
				// longest_match() sets match_start */
				if (match_length > lookahead) {
					match_length = lookahead;
				}
			}
			if (match_length >= MIN_MATCH) {
				// check_match(strstart, match_start, match_length);

				flush = ct_tally(strstart - match_start, match_length - MIN_MATCH);
				lookahead -= match_length;

				// Insert new strings in the hash table only if the match length
				// is not too large. This saves time but degrades compression.
				if (match_length <= max_lazy_match) {
					match_length--; // string at strstart already in hash table
					do {
						strstart++;
						INSERT_STRING();
						// strstart never exceeds WSIZE-MAX_MATCH, so there are
						// always MIN_MATCH bytes ahead. If lookahead < MIN_MATCH
						// these bytes are garbage, but it does not matter since
						// the next lookahead bytes will be emitted as literals.
					} while (--match_length !== 0);
					strstart++;
				} else {
					strstart += match_length;
					match_length = 0;
					ins_h = window[strstart] & 0xff;
					// UPDATE_HASH(ins_h, window[strstart + 1]);
					ins_h = ((ins_h << H_SHIFT) ^ (window[strstart + 1] & 0xff)) & HASH_MASK;

				//#if MIN_MATCH !== 3
				//		Call UPDATE_HASH() MIN_MATCH-3 more times
				//#endif

				}
			} else {
				// No match, output a literal byte */
				flush = ct_tally(0, window[strstart] & 0xff);
				lookahead--;
				strstart++;
			}
			if (flush) {
				flush_block(0);
				block_start = strstart;
			}

			// Make sure that we always have enough lookahead, except
			// at the end of the input file. We need MAX_MATCH bytes
			// for the next match, plus MIN_MATCH bytes to insert the
			// string following the next match.
			while (lookahead < MIN_LOOKAHEAD && !eofile) {
				fill_window();
			}
		}
	}

	function deflate_better() {
		// Process the input block. */
		while (lookahead !== 0 && qhead === null) {
			// Insert the string window[strstart .. strstart+2] in the
			// dictionary, and set hash_head to the head of the hash chain:
			INSERT_STRING();

			// Find the longest match, discarding those <= prev_length.
			prev_length = match_length;
			prev_match = match_start;
			match_length = MIN_MATCH - 1;

			if (hash_head !== NIL && prev_length < max_lazy_match && strstart - hash_head <= MAX_DIST) {
				// To simplify the code, we prevent matches with the string
				// of window index 0 (in particular we have to avoid a match
				// of the string with itself at the start of the input file).
				match_length = longest_match(hash_head);
				// longest_match() sets match_start */
				if (match_length > lookahead) {
					match_length = lookahead;
				}

				// Ignore a length 3 match if it is too distant: */
				if (match_length === MIN_MATCH && strstart - match_start > TOO_FAR) {
					// If prev_match is also MIN_MATCH, match_start is garbage
					// but we will ignore the current match anyway.
					match_length--;
				}
			}
			// If there was a match at the previous step and the current
			// match is not better, output the previous match:
			if (prev_length >= MIN_MATCH && match_length <= prev_length) {
				var flush; // set if current block must be flushed

				// check_match(strstart - 1, prev_match, prev_length);
				flush = ct_tally(strstart - 1 - prev_match, prev_length - MIN_MATCH);

				// Insert in hash table all strings up to the end of the match.
				// strstart-1 and strstart are already inserted.
				lookahead -= prev_length - 1;
				prev_length -= 2;
				do {
					strstart++;
					INSERT_STRING();
					// strstart never exceeds WSIZE-MAX_MATCH, so there are
					// always MIN_MATCH bytes ahead. If lookahead < MIN_MATCH
					// these bytes are garbage, but it does not matter since the
					// next lookahead bytes will always be emitted as literals.
				} while (--prev_length !== 0);
				match_available = false;
				match_length = MIN_MATCH - 1;
				strstart++;
				if (flush) {
					flush_block(0);
					block_start = strstart;
				}
			} else if (match_available) {
				// If there was no match at the previous position, output a
				// single literal. If there was a match but the current match
				// is longer, truncate the previous match to a single literal.
				if (ct_tally(0, window[strstart - 1] & 0xff)) {
					flush_block(0);
					block_start = strstart;
				}
				strstart++;
				lookahead--;
			} else {
				// There is no previous match to compare with, wait for
				// the next step to decide.
				match_available = true;
				strstart++;
				lookahead--;
			}

			// Make sure that we always have enough lookahead, except
			// at the end of the input file. We need MAX_MATCH bytes
			// for the next match, plus MIN_MATCH bytes to insert the
			// string following the next match.
			while (lookahead < MIN_LOOKAHEAD && !eofile) {
				fill_window();
			}
		}
	}

	function init_deflate() {
		if (eofile) {
			return;
		}
		bi_buf = 0;
		bi_valid = 0;
		ct_init();
		lm_init();

		qhead = null;
		outcnt = 0;
		outoff = 0;

		if (compr_level <= 3) {
			prev_length = MIN_MATCH - 1;
			match_length = 0;
		} else {
			match_length = MIN_MATCH - 1;
			match_available = false;
		}

		complete = false;
	}

	/* ==========================================================================
	 * Same as above, but achieves better compression. We use a lazy
	 * evaluation for matches: a match is finally adopted only if there is
	 * no better match at the next window position.
	 */
	function deflate_internal(buff, off, buff_size) {
		var n;

		if (!initflag) {
			init_deflate();
			initflag = true;
			if (lookahead === 0) { // empty
				complete = true;
				return 0;
			}
		}

		n = qcopy(buff, off, buff_size);
		if (n === buff_size) {
			return buff_size;
		}

		if (complete) {
			return n;
		}

		if (compr_level <= 3) {
			// optimized for speed
			deflate_fast();
		} else {
			deflate_better();
		}

		if (lookahead === 0) {
			if (match_available) {
				ct_tally(0, window[strstart - 1] & 0xff);
			}
			flush_block(1);
			complete = true;
		}

		return n + qcopy(buff, n + off, buff_size - n);
	}

	function qcopy(buff, off, buff_size) {
		var n, i, j;

		n = 0;
		while (qhead !== null && n < buff_size) {
			i = buff_size - n;
			if (i > qhead.len) {
				i = qhead.len;
			}
			// System.arraycopy(qhead.ptr, qhead.off, buff, off + n, i);
			for (j = 0; j < i; j++) {
				buff[off + n + j] = qhead.ptr[qhead.off + j];
			}

			qhead.off += i;
			qhead.len -= i;
			n += i;
			if (qhead.len === 0) {
				var p;
				p = qhead;
				qhead = qhead.next;
				reuse_queue(p);
			}
		}

		if (n === buff_size) {
			return n;
		}

		if (outoff < outcnt) {
			i = buff_size - n;
			if (i > outcnt - outoff) {
				i = outcnt - outoff;
			}
			// System.arraycopy(outbuf, outoff, buff, off + n, i);
			for (j = 0; j < i; j++) {
				buff[off + n + j] = outbuf[outoff + j];
			}
			outoff += i;
			n += i;
			if (outcnt === outoff) {
				outcnt = outoff = 0;
			}
		}
		return n;
	}

	/* ==========================================================================
	 * Allocate the match buffer, initialize the various tables and save the
	 * location of the internal file attribute (ascii/binary) and method
	 * (DEFLATE/STORE).
	 */
	function ct_init() {
		var n; // iterates over tree elements
		var bits; // bit counter
		var length; // length value
		var code; // code value
		var dist; // distance index

		if (static_dtree[0].dl !== 0) {
			return; // ct_init already called
		}

		l_desc.dyn_tree = dyn_ltree;
		l_desc.static_tree = static_ltree;
		l_desc.extra_bits = extra_lbits;
		l_desc.extra_base = LITERALS + 1;
		l_desc.elems = L_CODES;
		l_desc.max_length = MAX_BITS;
		l_desc.max_code = 0;

		d_desc.dyn_tree = dyn_dtree;
		d_desc.static_tree = static_dtree;
		d_desc.extra_bits = extra_dbits;
		d_desc.extra_base = 0;
		d_desc.elems = D_CODES;
		d_desc.max_length = MAX_BITS;
		d_desc.max_code = 0;

		bl_desc.dyn_tree = bl_tree;
		bl_desc.static_tree = null;
		bl_desc.extra_bits = extra_blbits;
		bl_desc.extra_base = 0;
		bl_desc.elems = BL_CODES;
		bl_desc.max_length = MAX_BL_BITS;
		bl_desc.max_code = 0;

	 // Initialize the mapping length (0..255) -> length code (0..28)
		length = 0;
		for (code = 0; code < LENGTH_CODES - 1; code++) {
			base_length[code] = length;
			for (n = 0; n < (1 << extra_lbits[code]); n++) {
				length_code[length++] = code;
			}
		}
	 // Assert (length === 256, "ct_init: length !== 256");

		// Note that the length 255 (match length 258) can be represented
		// in two different ways: code 284 + 5 bits or code 285, so we
		// overwrite length_code[255] to use the best encoding:
		length_code[length - 1] = code;

		// Initialize the mapping dist (0..32K) -> dist code (0..29) */
		dist = 0;
		for (code = 0; code < 16; code++) {
			base_dist[code] = dist;
			for (n = 0; n < (1 << extra_dbits[code]); n++) {
				dist_code[dist++] = code;
			}
		}
		// Assert (dist === 256, "ct_init: dist !== 256");
		// from now on, all distances are divided by 128
		for (dist >>= 7; code < D_CODES; code++) {
			base_dist[code] = dist << 7;
			for (n = 0; n < (1 << (extra_dbits[code] - 7)); n++) {
				dist_code[256 + dist++] = code;
			}
		}
		// Assert (dist === 256, "ct_init: 256+dist !== 512");

		// Construct the codes of the static literal tree
		for (bits = 0; bits <= MAX_BITS; bits++) {
			bl_count[bits] = 0;
		}
		n = 0;
		while (n <= 143) {
			static_ltree[n++].dl = 8;
			bl_count[8]++;
		}
		while (n <= 255) {
			static_ltree[n++].dl = 9;
			bl_count[9]++;
		}
		while (n <= 279) {
			static_ltree[n++].dl = 7;
			bl_count[7]++;
		}
		while (n <= 287) {
			static_ltree[n++].dl = 8;
			bl_count[8]++;
		}
		// Codes 286 and 287 do not exist, but we must include them in the
		// tree construction to get a canonical Huffman tree (longest code
		// all ones)
		gen_codes(static_ltree, L_CODES + 1);

		// The static distance tree is trivial: */
		for (n = 0; n < D_CODES; n++) {
			static_dtree[n].dl = 5;
			static_dtree[n].fc = bi_reverse(n, 5);
		}

		// Initialize the first block of the first file:
		init_block();
	}

	/* ==========================================================================
	 * Initialize a new block.
	 */
	function init_block() {
		var n; // iterates over tree elements

		// Initialize the trees.
		for (n = 0; n < L_CODES;  n++) {
			dyn_ltree[n].fc = 0;
		}
		for (n = 0; n < D_CODES;  n++) {
			dyn_dtree[n].fc = 0;
		}
		for (n = 0; n < BL_CODES; n++) {
			bl_tree[n].fc = 0;
		}

		dyn_ltree[END_BLOCK].fc = 1;
		opt_len = static_len = 0;
		last_lit = last_dist = last_flags = 0;
		flags = 0;
		flag_bit = 1;
	}

	/* ==========================================================================
	 * Restore the heap property by moving down the tree starting at node k,
	 * exchanging a node with the smallest of its two sons if necessary, stopping
	 * when the heap property is re-established (each father smaller than its
	 * two sons).
	 *
	 * @param tree- tree to restore
	 * @param k- node to move down
	 */
	function pqdownheap(tree, k) {
		var v = heap[k],
			j = k << 1; // left son of k

		while (j <= heap_len) {
			// Set j to the smallest of the two sons:
			if (j < heap_len && SMALLER(tree, heap[j + 1], heap[j])) {
				j++;
			}

			// Exit if v is smaller than both sons
			if (SMALLER(tree, v, heap[j])) {
				break;
			}

			// Exchange v with the smallest son
			heap[k] = heap[j];
			k = j;

			// And continue down the tree, setting j to the left son of k
			j <<= 1;
		}
		heap[k] = v;
	}

	/* ==========================================================================
	 * Compute the optimal bit lengths for a tree and update the total bit length
	 * for the current block.
	 * IN assertion: the fields freq and dad are set, heap[heap_max] and
	 *    above are the tree nodes sorted by increasing frequency.
	 * OUT assertions: the field len is set to the optimal bit length, the
	 *     array bl_count contains the frequencies for each bit length.
	 *     The length opt_len is updated; static_len is also updated if stree is
	 *     not null.
	 */
	function gen_bitlen(desc) { // the tree descriptor
		var tree = desc.dyn_tree;
		var extra = desc.extra_bits;
		var base = desc.extra_base;
		var max_code = desc.max_code;
		var max_length = desc.max_length;
		var stree = desc.static_tree;
		var h; // heap index
		var n, m; // iterate over the tree elements
		var bits; // bit length
		var xbits; // extra bits
		var f; // frequency
		var overflow = 0; // number of elements with bit length too large

		for (bits = 0; bits <= MAX_BITS; bits++) {
			bl_count[bits] = 0;
		}

		// In a first pass, compute the optimal bit lengths (which may
		// overflow in the case of the bit length tree).
		tree[heap[heap_max]].dl = 0; // root of the heap

		for (h = heap_max + 1; h < HEAP_SIZE; h++) {
			n = heap[h];
			bits = tree[tree[n].dl].dl + 1;
			if (bits > max_length) {
				bits = max_length;
				overflow++;
			}
			tree[n].dl = bits;
			// We overwrite tree[n].dl which is no longer needed

			if (n > max_code) {
				continue; // not a leaf node
			}

			bl_count[bits]++;
			xbits = 0;
			if (n >= base) {
				xbits = extra[n - base];
			}
			f = tree[n].fc;
			opt_len += f * (bits + xbits);
			if (stree !== null) {
				static_len += f * (stree[n].dl + xbits);
			}
		}
		if (overflow === 0) {
			return;
		}

		// This happens for example on obj2 and pic of the Calgary corpus

		// Find the first bit length which could increase:
		do {
			bits = max_length - 1;
			while (bl_count[bits] === 0) {
				bits--;
			}
			bl_count[bits]--; // move one leaf down the tree
			bl_count[bits + 1] += 2; // move one overflow item as its brother
			bl_count[max_length]--;
			// The brother of the overflow item also moves one step up,
			// but this does not affect bl_count[max_length]
			overflow -= 2;
		} while (overflow > 0);

		// Now recompute all bit lengths, scanning in increasing frequency.
		// h is still equal to HEAP_SIZE. (It is simpler to reconstruct all
		// lengths instead of fixing only the wrong ones. This idea is taken
		// from 'ar' written by Haruhiko Okumura.)
		for (bits = max_length; bits !== 0; bits--) {
			n = bl_count[bits];
			while (n !== 0) {
				m = heap[--h];
				if (m > max_code) {
					continue;
				}
				if (tree[m].dl !== bits) {
					opt_len += (bits - tree[m].dl) * tree[m].fc;
					tree[m].fc = bits;
				}
				n--;
			}
		}
	}

	  /* ==========================================================================
	   * Generate the codes for a given tree and bit counts (which need not be
	   * optimal).
	   * IN assertion: the array bl_count contains the bit length statistics for
	   * the given tree and the field len is set for all tree elements.
	   * OUT assertion: the field code is set for all tree elements of non
	   *     zero code length.
	   * @param tree- the tree to decorate
	   * @param max_code- largest code with non-zero frequency
	   */
	function gen_codes(tree, max_code) {
		var next_code = []; // new Array(MAX_BITS + 1); // next code value for each bit length
		var code = 0; // running code value
		var bits; // bit index
		var n; // code index

		// The distribution counts are first used to generate the code values
		// without bit reversal.
		for (bits = 1; bits <= MAX_BITS; bits++) {
			code = ((code + bl_count[bits - 1]) << 1);
			next_code[bits] = code;
		}

		// Check that the bit counts in bl_count are consistent. The last code
		// must be all ones.
		// Assert (code + encoder->bl_count[MAX_BITS]-1 === (1<<MAX_BITS)-1, "inconsistent bit counts");
		// Tracev((stderr,"\ngen_codes: max_code %d ", max_code));

		for (n = 0; n <= max_code; n++) {
			var len = tree[n].dl;
			if (len === 0) {
				continue;
			}
			// Now reverse the bits
			tree[n].fc = bi_reverse(next_code[len]++, len);

			// Tracec(tree !== static_ltree, (stderr,"\nn %3d %c l %2d c %4x (%x) ", n, (isgraph(n) ? n : ' '), len, tree[n].fc, next_code[len]-1));
		}
	}

	/* ==========================================================================
	 * Construct one Huffman tree and assigns the code bit strings and lengths.
	 * Update the total bit length for the current block.
	 * IN assertion: the field freq is set for all tree elements.
	 * OUT assertions: the fields len and code are set to the optimal bit length
	 *     and corresponding code. The length opt_len is updated; static_len is
	 *     also updated if stree is not null. The field max_code is set.
	 */
	function build_tree(desc) { // the tree descriptor
		var tree = desc.dyn_tree;
		var stree = desc.static_tree;
		var elems = desc.elems;
		var n, m; // iterate over heap elements
		var max_code = -1; // largest code with non zero frequency
		var node = elems; // next internal node of the tree

		// Construct the initial heap, with least frequent element in
		// heap[SMALLEST]. The sons of heap[n] are heap[2*n] and heap[2*n+1].
		// heap[0] is not used.
		heap_len = 0;
		heap_max = HEAP_SIZE;

		for (n = 0; n < elems; n++) {
			if (tree[n].fc !== 0) {
				heap[++heap_len] = max_code = n;
				depth[n] = 0;
			} else {
				tree[n].dl = 0;
			}
		}

		// The pkzip format requires that at least one distance code exists,
		// and that at least one bit should be sent even if there is only one
		// possible code. So to avoid special checks later on we force at least
		// two codes of non zero frequency.
		while (heap_len < 2) {
			var xnew = heap[++heap_len] = (max_code < 2 ? ++max_code : 0);
			tree[xnew].fc = 1;
			depth[xnew] = 0;
			opt_len--;
			if (stree !== null) {
				static_len -= stree[xnew].dl;
			}
			// new is 0 or 1 so it does not have extra bits
		}
		desc.max_code = max_code;

		// The elements heap[heap_len/2+1 .. heap_len] are leaves of the tree,
		// establish sub-heaps of increasing lengths:
		for (n = heap_len >> 1; n >= 1; n--) {
			pqdownheap(tree, n);
		}

		// Construct the Huffman tree by repeatedly combining the least two
		// frequent nodes.
		do {
			n = heap[SMALLEST];
			heap[SMALLEST] = heap[heap_len--];
			pqdownheap(tree, SMALLEST);

			m = heap[SMALLEST]; // m = node of next least frequency

			// keep the nodes sorted by frequency
			heap[--heap_max] = n;
			heap[--heap_max] = m;

			// Create a new node father of n and m
			tree[node].fc = tree[n].fc + tree[m].fc;
			//	depth[node] = (char)(MAX(depth[n], depth[m]) + 1);
			if (depth[n] > depth[m] + 1) {
				depth[node] = depth[n];
			} else {
				depth[node] = depth[m] + 1;
			}
			tree[n].dl = tree[m].dl = node;

			// and insert the new node in the heap
			heap[SMALLEST] = node++;
			pqdownheap(tree, SMALLEST);

		} while (heap_len >= 2);

		heap[--heap_max] = heap[SMALLEST];

		// At this point, the fields freq and dad are set. We can now
		// generate the bit lengths.
		gen_bitlen(desc);

		// The field len is now set, we can generate the bit codes
		gen_codes(tree, max_code);
	}

	/* ==========================================================================
	 * Scan a literal or distance tree to determine the frequencies of the codes
	 * in the bit length tree. Updates opt_len to take into account the repeat
	 * counts. (The contribution of the bit length codes will be added later
	 * during the construction of bl_tree.)
	 *
	 * @param tree- the tree to be scanned
	 * @param max_code- and its largest code of non zero frequency
	 */
	function scan_tree(tree, max_code) {
		var n, // iterates over all tree elements
			prevlen = -1, // last emitted length
			curlen, // length of current code
			nextlen = tree[0].dl, // length of next code
			count = 0, // repeat count of the current code
			max_count = 7, // max repeat count
			min_count = 4; // min repeat count

		if (nextlen === 0) {
			max_count = 138;
			min_count = 3;
		}
		tree[max_code + 1].dl = 0xffff; // guard

		for (n = 0; n <= max_code; n++) {
			curlen = nextlen;
			nextlen = tree[n + 1].dl;
			if (++count < max_count && curlen === nextlen) {
				continue;
			} else if (count < min_count) {
				bl_tree[curlen].fc += count;
			} else if (curlen !== 0) {
				if (curlen !== prevlen) {
					bl_tree[curlen].fc++;
				}
				bl_tree[REP_3_6].fc++;
			} else if (count <= 10) {
				bl_tree[REPZ_3_10].fc++;
			} else {
				bl_tree[REPZ_11_138].fc++;
			}
			count = 0; prevlen = curlen;
			if (nextlen === 0) {
				max_count = 138;
				min_count = 3;
			} else if (curlen === nextlen) {
				max_count = 6;
				min_count = 3;
			} else {
				max_count = 7;
				min_count = 4;
			}
		}
	}

	/* ==========================================================================
	 * Send a literal or distance tree in compressed form, using the codes in
	 * bl_tree.
	 *
	 * @param tree- the tree to be scanned
	 * @param max_code- and its largest code of non zero frequency
	 */
	function send_tree(tree, max_code) {
		var n; // iterates over all tree elements
		var prevlen = -1; // last emitted length
		var curlen; // length of current code
		var nextlen = tree[0].dl; // length of next code
		var count = 0; // repeat count of the current code
		var max_count = 7; // max repeat count
		var min_count = 4; // min repeat count

		// tree[max_code+1].dl = -1; */  /* guard already set */
		if (nextlen === 0) {
			max_count = 138;
			min_count = 3;
		}

		for (n = 0; n <= max_code; n++) {
			curlen = nextlen;
			nextlen = tree[n + 1].dl;
			if (++count < max_count && curlen === nextlen) {
				continue;
			} else if (count < min_count) {
				do {
					SEND_CODE(curlen, bl_tree);
				} while (--count !== 0);
			} else if (curlen !== 0) {
				if (curlen !== prevlen) {
					SEND_CODE(curlen, bl_tree);
					count--;
				}
			// Assert(count >= 3 && count <= 6, " 3_6?");
				SEND_CODE(REP_3_6, bl_tree);
				send_bits(count - 3, 2);
			} else if (count <= 10) {
				SEND_CODE(REPZ_3_10, bl_tree);
				send_bits(count - 3, 3);
			} else {
				SEND_CODE(REPZ_11_138, bl_tree);
				send_bits(count - 11, 7);
			}
			count = 0;
			prevlen = curlen;
			if (nextlen === 0) {
				max_count = 138;
				min_count = 3;
			} else if (curlen === nextlen) {
				max_count = 6;
				min_count = 3;
			} else {
				max_count = 7;
				min_count = 4;
			}
		}
	}

	/* ==========================================================================
	 * Construct the Huffman tree for the bit lengths and return the index in
	 * bl_order of the last bit length code to send.
	 */
	function build_bl_tree() {
		var max_blindex; // index of last bit length code of non zero freq

		// Determine the bit length frequencies for literal and distance trees
		scan_tree(dyn_ltree, l_desc.max_code);
		scan_tree(dyn_dtree, d_desc.max_code);

		// Build the bit length tree:
		build_tree(bl_desc);
		// opt_len now includes the length of the tree representations, except
		// the lengths of the bit lengths codes and the 5+5+4 bits for the counts.

		// Determine the number of bit length codes to send. The pkzip format
		// requires that at least 4 bit length codes be sent. (appnote.txt says
		// 3 but the actual value used is 4.)
		for (max_blindex = BL_CODES - 1; max_blindex >= 3; max_blindex--) {
			if (bl_tree[bl_order[max_blindex]].dl !== 0) {
				break;
			}
		}
		// Update opt_len to include the bit length tree and counts */
		opt_len += 3 * (max_blindex + 1) + 5 + 5 + 4;
		// Tracev((stderr, "\ndyn trees: dyn %ld, stat %ld",
		// encoder->opt_len, encoder->static_len));

		return max_blindex;
	}

	/* ==========================================================================
	 * Send the header for a block using dynamic Huffman trees: the counts, the
	 * lengths of the bit length codes, the literal tree and the distance tree.
	 * IN assertion: lcodes >= 257, dcodes >= 1, blcodes >= 4.
	 */
	function send_all_trees(lcodes, dcodes, blcodes) { // number of codes for each tree
		var rank; // index in bl_order

		// Assert (lcodes >= 257 && dcodes >= 1 && blcodes >= 4, "not enough codes");
		// Assert (lcodes <= L_CODES && dcodes <= D_CODES && blcodes <= BL_CODES, "too many codes");
		// Tracev((stderr, "\nbl counts: "));
		send_bits(lcodes - 257, 5); // not +255 as stated in appnote.txt
		send_bits(dcodes - 1,   5);
		send_bits(blcodes - 4,  4); // not -3 as stated in appnote.txt
		for (rank = 0; rank < blcodes; rank++) {
			// Tracev((stderr, "\nbl code %2d ", bl_order[rank]));
			send_bits(bl_tree[bl_order[rank]].dl, 3);
		}

		// send the literal tree
		send_tree(dyn_ltree, lcodes - 1);

		// send the distance tree
		send_tree(dyn_dtree, dcodes - 1);
	}

	/* ==========================================================================
	 * Determine the best encoding for the current block: dynamic trees, static
	 * trees or store, and output the encoded block to the zip file.
	 */
	function flush_block(eof) { // true if this is the last block for a file
		var opt_lenb, static_lenb, // opt_len and static_len in bytes
			max_blindex, // index of last bit length code of non zero freq
			stored_len, // length of input block
			i;

		stored_len = strstart - block_start;
		flag_buf[last_flags] = flags; // Save the flags for the last 8 items

		// Construct the literal and distance trees
		build_tree(l_desc);
		// Tracev((stderr, "\nlit data: dyn %ld, stat %ld",
		// encoder->opt_len, encoder->static_len));

		build_tree(d_desc);
		// Tracev((stderr, "\ndist data: dyn %ld, stat %ld",
		// encoder->opt_len, encoder->static_len));
		// At this point, opt_len and static_len are the total bit lengths of
		// the compressed block data, excluding the tree representations.

		// Build the bit length tree for the above two trees, and get the index
		// in bl_order of the last bit length code to send.
		max_blindex = build_bl_tree();

	 // Determine the best encoding. Compute first the block length in bytes
		opt_lenb = (opt_len + 3 + 7) >> 3;
		static_lenb = (static_len + 3 + 7) >> 3;

	//  Trace((stderr, "\nopt %lu(%lu) stat %lu(%lu) stored %lu lit %u dist %u ", opt_lenb, encoder->opt_len, static_lenb, encoder->static_len, stored_len, encoder->last_lit, encoder->last_dist));

		if (static_lenb <= opt_lenb) {
			opt_lenb = static_lenb;
		}
		if (stored_len + 4 <= opt_lenb && block_start >= 0) { // 4: two words for the lengths
			// The test buf !== NULL is only necessary if LIT_BUFSIZE > WSIZE.
			// Otherwise we can't have processed more than WSIZE input bytes since
			// the last block flush, because compression would have been
			// successful. If LIT_BUFSIZE <= WSIZE, it is never too late to
			// transform a block into a stored block.
			send_bits((STORED_BLOCK << 1) + eof, 3);  /* send block type */
			bi_windup();         /* align on byte boundary */
			put_short(stored_len);
			put_short(~stored_len);

			// copy block
			/*
				p = &window[block_start];
				for (i = 0; i < stored_len; i++) {
					put_byte(p[i]);
				}
			*/
			for (i = 0; i < stored_len; i++) {
				put_byte(window[block_start + i]);
			}
		} else if (static_lenb === opt_lenb) {
			send_bits((STATIC_TREES << 1) + eof, 3);
			compress_block(static_ltree, static_dtree);
		} else {
			send_bits((DYN_TREES << 1) + eof, 3);
			send_all_trees(l_desc.max_code + 1, d_desc.max_code + 1, max_blindex + 1);
			compress_block(dyn_ltree, dyn_dtree);
		}

		init_block();

		if (eof !== 0) {
			bi_windup();
		}
	}

	/* ==========================================================================
	 * Save the match info and tally the frequency counts. Return true if
	 * the current block must be flushed.
	 *
	 * @param dist- distance of matched string
	 * @param lc- (match length - MIN_MATCH) or unmatched char (if dist === 0)
	 */
	function ct_tally(dist, lc) {
		l_buf[last_lit++] = lc;
		if (dist === 0) {
			// lc is the unmatched char
			dyn_ltree[lc].fc++;
		} else {
			// Here, lc is the match length - MIN_MATCH
			dist--; // dist = match distance - 1
			// Assert((ush)dist < (ush)MAX_DIST && (ush)lc <= (ush)(MAX_MATCH-MIN_MATCH) && (ush)D_CODE(dist) < (ush)D_CODES,  "ct_tally: bad match");

			dyn_ltree[length_code[lc] + LITERALS + 1].fc++;
			dyn_dtree[D_CODE(dist)].fc++;

			d_buf[last_dist++] = dist;
			flags |= flag_bit;
		}
		flag_bit <<= 1;

		// Output the flags if they fill a byte
		if ((last_lit & 7) === 0) {
			flag_buf[last_flags++] = flags;
			flags = 0;
			flag_bit = 1;
		}
		// Try to guess if it is profitable to stop the current block here
		if (compr_level > 2 && (last_lit & 0xfff) === 0) {
			// Compute an upper bound for the compressed length
			var out_length = last_lit * 8;
			var in_length = strstart - block_start;
			var dcode;

			for (dcode = 0; dcode < D_CODES; dcode++) {
				out_length += dyn_dtree[dcode].fc * (5 + extra_dbits[dcode]);
			}
			out_length >>= 3;
			// Trace((stderr,"\nlast_lit %u, last_dist %u, in %ld, out ~%ld(%ld%%) ", encoder->last_lit, encoder->last_dist, in_length, out_length, 100L - out_length*100L/in_length));
			if (last_dist < parseInt(last_lit / 2, 10) && out_length < parseInt(in_length / 2, 10)) {
				return true;
			}
		}
		return (last_lit === LIT_BUFSIZE - 1 || last_dist === DIST_BUFSIZE);
		// We avoid equality with LIT_BUFSIZE because of wraparound at 64K
		// on 16 bit machines and because stored blocks are restricted to
		// 64K-1 bytes.
	}

	  /* ==========================================================================
	   * Send the block data compressed using the given Huffman trees
	   *
	   * @param ltree- literal tree
	   * @param dtree- distance tree
	   */
	function compress_block(ltree, dtree) {
		var dist; // distance of matched string
		var lc; // match length or unmatched char (if dist === 0)
		var lx = 0; // running index in l_buf
		var dx = 0; // running index in d_buf
		var fx = 0; // running index in flag_buf
		var flag = 0; // current flags
		var code; // the code to send
		var extra; // number of extra bits to send

		if (last_lit !== 0) {
			do {
				if ((lx & 7) === 0) {
					flag = flag_buf[fx++];
				}
				lc = l_buf[lx++] & 0xff;
				if ((flag & 1) === 0) {
					SEND_CODE(lc, ltree); /* send a literal byte */
					//	Tracecv(isgraph(lc), (stderr," '%c' ", lc));
				} else {
					// Here, lc is the match length - MIN_MATCH
					code = length_code[lc];
					SEND_CODE(code + LITERALS + 1, ltree); // send the length code
					extra = extra_lbits[code];
					if (extra !== 0) {
						lc -= base_length[code];
						send_bits(lc, extra); // send the extra length bits
					}
					dist = d_buf[dx++];
					// Here, dist is the match distance - 1
					code = D_CODE(dist);
					//	Assert (code < D_CODES, "bad d_code");

					SEND_CODE(code, dtree); // send the distance code
					extra = extra_dbits[code];
					if (extra !== 0) {
						dist -= base_dist[code];
						send_bits(dist, extra); // send the extra distance bits
					}
				} // literal or match pair ?
				flag >>= 1;
			} while (lx < last_lit);
		}

		SEND_CODE(END_BLOCK, ltree);
	}

	/* ==========================================================================
	 * Send a value on a given number of bits.
	 * IN assertion: length <= 16 and value fits in length bits.
	 *
	 * @param value- value to send
	 * @param length- number of bits
	 */
	var Buf_size = 16; // bit size of bi_buf
	function send_bits(value, length) {
		// If not enough room in bi_buf, use (valid) bits from bi_buf and
		// (16 - bi_valid) bits from value, leaving (width - (16-bi_valid))
		// unused bits in value.
		if (bi_valid > Buf_size - length) {
			bi_buf |= (value << bi_valid);
			put_short(bi_buf);
			bi_buf = (value >> (Buf_size - bi_valid));
			bi_valid += length - Buf_size;
		} else {
			bi_buf |= value << bi_valid;
			bi_valid += length;
		}
	}

	/* ==========================================================================
	 * Reverse the first len bits of a code, using straightforward code (a faster
	 * method would use a table)
	 * IN assertion: 1 <= len <= 15
	 *
	 * @param code- the value to invert
	 * @param len- its bit length
	 */
	function bi_reverse(code, len) {
		var res = 0;
		do {
			res |= code & 1;
			code >>= 1;
			res <<= 1;
		} while (--len > 0);
		return res >> 1;
	}

	/* ==========================================================================
	 * Write out any remaining bits in an incomplete byte.
	 */
	function bi_windup() {
		if (bi_valid > 8) {
			put_short(bi_buf);
		} else if (bi_valid > 0) {
			put_byte(bi_buf);
		}
		bi_buf = 0;
		bi_valid = 0;
	}

	function qoutbuf() {
		var q, i;
		if (outcnt !== 0) {
			q = new_queue();
			if (qhead === null) {
				qhead = qtail = q;
			} else {
				qtail = qtail.next = q;
			}
			q.len = outcnt - outoff;
			// System.arraycopy(outbuf, outoff, q.ptr, 0, q.len);
			for (i = 0; i < q.len; i++) {
				q.ptr[i] = outbuf[outoff + i];
			}
			outcnt = outoff = 0;
		}
	}

	function deflate(arr, level) {
		var i, j, buff;

		deflate_data = arr;
		deflate_pos = 0;
		if (typeof level === "undefined") {
			level = DEFAULT_LEVEL;
		}
		deflate_start(level);

		buff = [];

		do {
			i = deflate_internal(buff, buff.length, 1024);
		} while (i > 0);

		deflate_data = null; // G.C.
		return buff;
	}

	module.exports = deflate;
	module.exports.DEFAULT_LEVEL = DEFAULT_LEVEL;
}());

},{}],42:[function(require,module,exports){
/*
 * $Id: rawinflate.js,v 0.2 2009/03/01 18:32:24 dankogai Exp $
 *
 * original:
 * http://www.onicos.com/staff/iz/amuse/javascript/expert/inflate.txt
 */

/* Copyright (C) 1999 Masanao Izumo <iz@onicos.co.jp>
 * Version: 1.0.0.1
 * LastModified: Dec 25 1999
 */

/* Interface:
 * data = inflate(src);
 */

(function () {
	/* constant parameters */
	var WSIZE = 32768, // Sliding Window size
		STORED_BLOCK = 0,
		STATIC_TREES = 1,
		DYN_TREES = 2,

	/* for inflate */
		lbits = 9, // bits in base literal/length lookup table
		dbits = 6, // bits in base distance lookup table

	/* variables (inflate) */
		slide,
		wp, // current position in slide
		fixed_tl = null, // inflate static
		fixed_td, // inflate static
		fixed_bl, // inflate static
		fixed_bd, // inflate static
		bit_buf, // bit buffer
		bit_len, // bits in bit buffer
		method,
		eof,
		copy_leng,
		copy_dist,
		tl, // literal length decoder table
		td, // literal distance decoder table
		bl, // number of bits decoded by tl
		bd, // number of bits decoded by td

		inflate_data,
		inflate_pos,


/* constant tables (inflate) */
		MASK_BITS = [
			0x0000,
			0x0001, 0x0003, 0x0007, 0x000f, 0x001f, 0x003f, 0x007f, 0x00ff,
			0x01ff, 0x03ff, 0x07ff, 0x0fff, 0x1fff, 0x3fff, 0x7fff, 0xffff
		],
		// Tables for deflate from PKZIP's appnote.txt.
		// Copy lengths for literal codes 257..285
		cplens = [
			3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31,
			35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0
		],
/* note: see note #13 above about the 258 in this list. */
		// Extra bits for literal codes 257..285
		cplext = [
			0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2,
			3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0, 99, 99 // 99==invalid
		],
		// Copy offsets for distance codes 0..29
		cpdist = [
			1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193,
			257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145,
			8193, 12289, 16385, 24577
		],
		// Extra bits for distance codes
		cpdext = [
			0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6,
			7, 7, 8, 8, 9, 9, 10, 10, 11, 11,
			12, 12, 13, 13
		],
		// Order of the bit length code lengths
		border = [
			16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15
		];
	/* objects (inflate) */

	function HuftList() {
		this.next = null;
		this.list = null;
	}

	function HuftNode() {
		this.e = 0; // number of extra bits or operation
		this.b = 0; // number of bits in this code or subcode

		// union
		this.n = 0; // literal, length base, or distance base
		this.t = null; // (HuftNode) pointer to next level of table
	}

	/*
	 * @param b-  code lengths in bits (all assumed <= BMAX)
	 * @param n- number of codes (assumed <= N_MAX)
	 * @param s- number of simple-valued codes (0..s-1)
	 * @param d- list of base values for non-simple codes
	 * @param e- list of extra bits for non-simple codes
	 * @param mm- maximum lookup bits
	 */
	function HuftBuild(b, n, s, d, e, mm) {
		this.BMAX = 16; // maximum bit length of any code
		this.N_MAX = 288; // maximum number of codes in any set
		this.status = 0; // 0: success, 1: incomplete table, 2: bad input
		this.root = null; // (HuftList) starting table
		this.m = 0; // maximum lookup bits, returns actual

	/* Given a list of code lengths and a maximum table size, make a set of
	   tables to decode that set of codes. Return zero on success, one if
	   the given code set is incomplete (the tables are still built in this
	   case), two if the input is invalid (all zero length codes or an
	   oversubscribed set of lengths), and three if not enough memory.
	   The code with value 256 is special, and the tables are constructed
	   so that no bits beyond that code are fetched when that code is
	   decoded. */
		var a; // counter for codes of length k
		var c = [];
		var el; // length of EOB code (value 256)
		var f; // i repeats in table every f entries
		var g; // maximum code length
		var h; // table level
		var i; // counter, current code
		var j; // counter
		var k; // number of bits in current code
		var lx = [];
		var p; // pointer into c[], b[], or v[]
		var pidx; // index of p
		var q; // (HuftNode) points to current table
		var r = new HuftNode(); // table entry for structure assignment
		var u = [];
		var v = [];
		var w;
		var x = [];
		var xp; // pointer into x or c
		var y; // number of dummy codes added
		var z; // number of entries in current table
		var o;
		var tail; // (HuftList)

		tail = this.root = null;

		// bit length count table
		for (i = 0; i < this.BMAX + 1; i++) {
			c[i] = 0;
		}
		// stack of bits per table
		for (i = 0; i < this.BMAX + 1; i++) {
			lx[i] = 0;
		}
		// HuftNode[BMAX][]  table stack
		for (i = 0; i < this.BMAX; i++) {
			u[i] = null;
		}
		// values in order of bit length
		for (i = 0; i < this.N_MAX; i++) {
			v[i] = 0;
		}
		// bit offsets, then code stack
		for (i = 0; i < this.BMAX + 1; i++) {
			x[i] = 0;
		}

		// Generate counts for each bit length
		el = n > 256 ? b[256] : this.BMAX; // set length of EOB code, if any
		p = b; pidx = 0;
		i = n;
		do {
			c[p[pidx]]++; // assume all entries <= BMAX
			pidx++;
		} while (--i > 0);
		if (c[0] === n) { // null input--all zero length codes
			this.root = null;
			this.m = 0;
			this.status = 0;
			return;
		}

		// Find minimum and maximum length, bound *m by those
		for (j = 1; j <= this.BMAX; j++) {
			if (c[j] !== 0) {
				break;
			}
		}
		k = j; // minimum code length
		if (mm < j) {
			mm = j;
		}
		for (i = this.BMAX; i !== 0; i--) {
			if (c[i] !== 0) {
				break;
			}
		}
		g = i; // maximum code length
		if (mm > i) {
			mm = i;
		}

		// Adjust last length count to fill out codes, if needed
		for (y = 1 << j; j < i; j++, y <<= 1) {
			if ((y -= c[j]) < 0) {
				this.status = 2; // bad input: more codes than bits
				this.m = mm;
				return;
			}
		}
		if ((y -= c[i]) < 0) {
			this.status = 2;
			this.m = mm;
			return;
		}
		c[i] += y;

		// Generate starting offsets into the value table for each length
		x[1] = j = 0;
		p = c;
		pidx = 1;
		xp = 2;
		while (--i > 0) { // note that i == g from above
			x[xp++] = (j += p[pidx++]);
		}

		// Make a table of values in order of bit lengths
		p = b; pidx = 0;
		i = 0;
		do {
			if ((j = p[pidx++]) !== 0) {
				v[x[j]++] = i;
			}
		} while (++i < n);
		n = x[g]; // set n to length of v

		// Generate the Huffman codes and for each, make the table entries
		x[0] = i = 0; // first Huffman code is zero
		p = v; pidx = 0; // grab values in bit order
		h = -1; // no tables yet--level -1
		w = lx[0] = 0; // no bits decoded yet
		q = null; // ditto
		z = 0; // ditto

		// go through the bit lengths (k already is bits in shortest code)
		for (null; k <= g; k++) {
			a = c[k];
			while (a-- > 0) {
				// here i is the Huffman code of length k bits for value p[pidx]
				// make tables up to required level
				while (k > w + lx[1 + h]) {
					w += lx[1 + h]; // add bits already decoded
					h++;

					// compute minimum size table less than or equal to *m bits
					z = (z = g - w) > mm ? mm : z; // upper limit
					if ((f = 1 << (j = k - w)) > a + 1) { // try a k-w bit table
						// too few codes for k-w bit table
						f -= a + 1; // deduct codes from patterns left
						xp = k;
						while (++j < z) { // try smaller tables up to z bits
							if ((f <<= 1) <= c[++xp]) {
								break; // enough codes to use up j bits
							}
							f -= c[xp]; // else deduct codes from patterns
						}
					}
					if (w + j > el && w < el) {
						j = el - w; // make EOB code end at table
					}
					z = 1 << j; // table entries for j-bit table
					lx[1 + h] = j; // set table size in stack

					// allocate and link in new table
					q = [];
					for (o = 0; o < z; o++) {
						q[o] = new HuftNode();
					}

					if (!tail) {
						tail = this.root = new HuftList();
					} else {
						tail = tail.next = new HuftList();
					}
					tail.next = null;
					tail.list = q;
					u[h] = q; // table starts after link

					/* connect to last table, if there is one */
					if (h > 0) {
						x[h] = i; // save pattern for backing up
						r.b = lx[h]; // bits to dump before this table
						r.e = 16 + j; // bits in this table
						r.t = q; // pointer to this table
						j = (i & ((1 << w) - 1)) >> (w - lx[h]);
						u[h - 1][j].e = r.e;
						u[h - 1][j].b = r.b;
						u[h - 1][j].n = r.n;
						u[h - 1][j].t = r.t;
					}
				}

				// set up table entry in r
				r.b = k - w;
				if (pidx >= n) {
					r.e = 99; // out of values--invalid code
				} else if (p[pidx] < s) {
					r.e = (p[pidx] < 256 ? 16 : 15); // 256 is end-of-block code
					r.n = p[pidx++]; // simple code is just the value
				} else {
					r.e = e[p[pidx] - s]; // non-simple--look up in lists
					r.n = d[p[pidx++] - s];
				}

				// fill code-like entries with r //
				f = 1 << (k - w);
				for (j = i >> w; j < z; j += f) {
					q[j].e = r.e;
					q[j].b = r.b;
					q[j].n = r.n;
					q[j].t = r.t;
				}

				// backwards increment the k-bit code i
				for (j = 1 << (k - 1); (i & j) !== 0; j >>= 1) {
					i ^= j;
				}
				i ^= j;

				// backup over finished tables
				while ((i & ((1 << w) - 1)) !== x[h]) {
					w -= lx[h]; // don't need to update q
					h--;
				}
			}
		}

		/* return actual size of base table */
		this.m = lx[1];

		/* Return true (1) if we were given an incomplete table */
		this.status = ((y !== 0 && g !== 1) ? 1 : 0);
	}


	/* routines (inflate) */

	function GET_BYTE() {
		if (inflate_data.length === inflate_pos) {
			return -1;
		}
		return inflate_data[inflate_pos++] & 0xff;
	}

	function NEEDBITS(n) {
		while (bit_len < n) {
			bit_buf |= GET_BYTE() << bit_len;
			bit_len += 8;
		}
	}

	function GETBITS(n) {
		return bit_buf & MASK_BITS[n];
	}

	function DUMPBITS(n) {
		bit_buf >>= n;
		bit_len -= n;
	}

	function inflate_codes(buff, off, size) {
		// inflate (decompress) the codes in a deflated (compressed) block.
		// Return an error code or zero if it all goes ok.
		var e; // table entry flag/number of extra bits
		var t; // (HuftNode) pointer to table entry
		var n;

		if (size === 0) {
			return 0;
		}

		// inflate the coded data
		n = 0;
		for (;;) { // do until end of block
			NEEDBITS(bl);
			t = tl.list[GETBITS(bl)];
			e = t.e;
			while (e > 16) {
				if (e === 99) {
					return -1;
				}
				DUMPBITS(t.b);
				e -= 16;
				NEEDBITS(e);
				t = t.t[GETBITS(e)];
				e = t.e;
			}
			DUMPBITS(t.b);

			if (e === 16) { // then it's a literal
				wp &= WSIZE - 1;
				buff[off + n++] = slide[wp++] = t.n;
				if (n === size) {
					return size;
				}
				continue;
			}

			// exit if end of block
			if (e === 15) {
				break;
			}

			// it's an EOB or a length

			// get length of block to copy
			NEEDBITS(e);
			copy_leng = t.n + GETBITS(e);
			DUMPBITS(e);

			// decode distance of block to copy
			NEEDBITS(bd);
			t = td.list[GETBITS(bd)];
			e = t.e;

			while (e > 16) {
				if (e === 99) {
					return -1;
				}
				DUMPBITS(t.b);
				e -= 16;
				NEEDBITS(e);
				t = t.t[GETBITS(e)];
				e = t.e;
			}
			DUMPBITS(t.b);
			NEEDBITS(e);
			copy_dist = wp - t.n - GETBITS(e);
			DUMPBITS(e);

			// do the copy
			while (copy_leng > 0 && n < size) {
				copy_leng--;
				copy_dist &= WSIZE - 1;
				wp &= WSIZE - 1;
				buff[off + n++] = slide[wp++] = slide[copy_dist++];
			}

			if (n === size) {
				return size;
			}
		}

		method = -1; // done
		return n;
	}

	function inflate_stored(buff, off, size) {
		/* "decompress" an inflated type 0 (stored) block. */
		var n;

		// go to byte boundary
		n = bit_len & 7;
		DUMPBITS(n);

		// get the length and its complement
		NEEDBITS(16);
		n = GETBITS(16);
		DUMPBITS(16);
		NEEDBITS(16);
		if (n !== ((~bit_buf) & 0xffff)) {
			return -1; // error in compressed data
		}
		DUMPBITS(16);

		// read and output the compressed data
		copy_leng = n;

		n = 0;
		while (copy_leng > 0 && n < size) {
			copy_leng--;
			wp &= WSIZE - 1;
			NEEDBITS(8);
			buff[off + n++] = slide[wp++] = GETBITS(8);
			DUMPBITS(8);
		}

		if (copy_leng === 0) {
			method = -1; // done
		}
		return n;
	}

	function inflate_fixed(buff, off, size) {
		// decompress an inflated type 1 (fixed Huffman codes) block.  We should
		// either replace this with a custom decoder, or at least precompute the
		// Huffman tables.

		// if first time, set up tables for fixed blocks
		if (!fixed_tl) {
			var i; // temporary variable
			var l = []; // 288 length list for huft_build (initialized below)
			var h; // HuftBuild

			// literal table
			for (i = 0; i < 144; i++) {
				l[i] = 8;
			}
			for (null; i < 256; i++) {
				l[i] = 9;
			}
			for (null; i < 280; i++) {
				l[i] = 7;
			}
			for (null; i < 288; i++) { // make a complete, but wrong code set
				l[i] = 8;
			}
			fixed_bl = 7;

			h = new HuftBuild(l, 288, 257, cplens, cplext, fixed_bl);
			if (h.status !== 0) {
				console.error("HufBuild error: " + h.status);
				return -1;
			}
			fixed_tl = h.root;
			fixed_bl = h.m;

			// distance table
			for (i = 0; i < 30; i++) { // make an incomplete code set
				l[i] = 5;
			}
			fixed_bd = 5;

			h = new HuftBuild(l, 30, 0, cpdist, cpdext, fixed_bd);
			if (h.status > 1) {
				fixed_tl = null;
				console.error("HufBuild error: " + h.status);
				return -1;
			}
			fixed_td = h.root;
			fixed_bd = h.m;
		}

		tl = fixed_tl;
		td = fixed_td;
		bl = fixed_bl;
		bd = fixed_bd;
		return inflate_codes(buff, off, size);
	}

	function inflate_dynamic(buff, off, size) {
		// decompress an inflated type 2 (dynamic Huffman codes) block.
		var i; // temporary variables
		var j;
		var l; // last length
		var n; // number of lengths to get
		var t; // (HuftNode) literal/length code table
		var nb; // number of bit length codes
		var nl; // number of literal/length codes
		var nd; // number of distance codes
		var ll = [];
		var h; // (HuftBuild)

		// literal/length and distance code lengths
		for (i = 0; i < 286 + 30; i++) {
			ll[i] = 0;
		}

		// read in table lengths
		NEEDBITS(5);
		nl = 257 + GETBITS(5); // number of literal/length codes
		DUMPBITS(5);
		NEEDBITS(5);
		nd = 1 + GETBITS(5); // number of distance codes
		DUMPBITS(5);
		NEEDBITS(4);
		nb = 4 + GETBITS(4); // number of bit length codes
		DUMPBITS(4);
		if (nl > 286 || nd > 30) {
			return -1; // bad lengths
		}

		// read in bit-length-code lengths
		for (j = 0; j < nb; j++) {
			NEEDBITS(3);
			ll[border[j]] = GETBITS(3);
			DUMPBITS(3);
		}
		for (null; j < 19; j++) {
			ll[border[j]] = 0;
		}

		// build decoding table for trees--single level, 7 bit lookup
		bl = 7;
		h = new HuftBuild(ll, 19, 19, null, null, bl);
		if (h.status !== 0) {
			return -1; // incomplete code set
		}

		tl = h.root;
		bl = h.m;

		// read in literal and distance code lengths
		n = nl + nd;
		i = l = 0;
		while (i < n) {
			NEEDBITS(bl);
			t = tl.list[GETBITS(bl)];
			j = t.b;
			DUMPBITS(j);
			j = t.n;
			if (j < 16) { // length of code in bits (0..15)
				ll[i++] = l = j; // save last length in l
			} else if (j === 16) { // repeat last length 3 to 6 times
				NEEDBITS(2);
				j = 3 + GETBITS(2);
				DUMPBITS(2);
				if (i + j > n) {
					return -1;
				}
				while (j-- > 0) {
					ll[i++] = l;
				}
			} else if (j === 17) { // 3 to 10 zero length codes
				NEEDBITS(3);
				j = 3 + GETBITS(3);
				DUMPBITS(3);
				if (i + j > n) {
					return -1;
				}
				while (j-- > 0) {
					ll[i++] = 0;
				}
				l = 0;
			} else { // j === 18: 11 to 138 zero length codes
				NEEDBITS(7);
				j = 11 + GETBITS(7);
				DUMPBITS(7);
				if (i + j > n) {
					return -1;
				}
				while (j-- > 0) {
					ll[i++] = 0;
				}
				l = 0;
			}
		}

		// build the decoding tables for literal/length and distance codes
		bl = lbits;
		h = new HuftBuild(ll, nl, 257, cplens, cplext, bl);
		if (bl === 0) { // no literals or lengths
			h.status = 1;
		}
		if (h.status !== 0) {
			if (h.status !== 1) {
				return -1; // incomplete code set
			}
			// **incomplete literal tree**
		}
		tl = h.root;
		bl = h.m;

		for (i = 0; i < nd; i++) {
			ll[i] = ll[i + nl];
		}
		bd = dbits;
		h = new HuftBuild(ll, nd, 0, cpdist, cpdext, bd);
		td = h.root;
		bd = h.m;

		if (bd === 0 && nl > 257) { // lengths but no distances
			// **incomplete distance tree**
			return -1;
		}
/*
		if (h.status === 1) {
			// **incomplete distance tree**
		}
*/
		if (h.status !== 0) {
			return -1;
		}

		// decompress until an end-of-block code
		return inflate_codes(buff, off, size);
	}

	function inflate_start() {
		if (!slide) {
			slide = []; // new Array(2 * WSIZE); // slide.length is never called
		}
		wp = 0;
		bit_buf = 0;
		bit_len = 0;
		method = -1;
		eof = false;
		copy_leng = copy_dist = 0;
		tl = null;
	}

	function inflate_internal(buff, off, size) {
		// decompress an inflated entry
		var n, i;

		n = 0;
		while (n < size) {
			if (eof && method === -1) {
				return n;
			}

			if (copy_leng > 0) {
				if (method !== STORED_BLOCK) {
					// STATIC_TREES or DYN_TREES
					while (copy_leng > 0 && n < size) {
						copy_leng--;
						copy_dist &= WSIZE - 1;
						wp &= WSIZE - 1;
						buff[off + n++] = slide[wp++] = slide[copy_dist++];
					}
				} else {
					while (copy_leng > 0 && n < size) {
						copy_leng--;
						wp &= WSIZE - 1;
						NEEDBITS(8);
						buff[off + n++] = slide[wp++] = GETBITS(8);
						DUMPBITS(8);
					}
					if (copy_leng === 0) {
						method = -1; // done
					}
				}
				if (n === size) {
					return n;
				}
			}

			if (method === -1) {
				if (eof) {
					break;
				}

				// read in last block bit
				NEEDBITS(1);
				if (GETBITS(1) !== 0) {
					eof = true;
				}
				DUMPBITS(1);

				// read in block type
				NEEDBITS(2);
				method = GETBITS(2);
				DUMPBITS(2);
				tl = null;
				copy_leng = 0;
			}

			switch (method) {
			case STORED_BLOCK:
				i = inflate_stored(buff, off + n, size - n);
				break;

			case STATIC_TREES:
				if (tl) {
					i = inflate_codes(buff, off + n, size - n);
				} else {
					i = inflate_fixed(buff, off + n, size - n);
				}
				break;

			case DYN_TREES:
				if (tl) {
					i = inflate_codes(buff, off + n, size - n);
				} else {
					i = inflate_dynamic(buff, off + n, size - n);
				}
				break;

			default: // error
				i = -1;
				break;
			}

			if (i === -1) {
				if (eof) {
					return 0;
				}
				return -1;
			}
			n += i;
		}
		return n;
	}

	function inflate(arr) {
		var buff = [], i;

		inflate_start();
		inflate_data = arr;
		inflate_pos = 0;

		do {
			i = inflate_internal(buff, buff.length, 1024);
		} while (i > 0);
		inflate_data = null; // G.C.
		return buff;
	}

	module.exports = inflate;
}());

},{}],43:[function(require,module,exports){
module.exports = require('./lib/prettyugly.js');


},{"./lib/prettyugly.js":52}],44:[function(require,module,exports){
module.exports = {

  test: function(name, nodes) {
    return name === 'atrulers';
  },

  process: function(node) {
    var pretty = [];
    for (var i = 0; i < node.length; i++) {
      if (node[i][0] === 'ruleset') {
        pretty.push(['s', '\n  ']);
        // go into blocks
        for (var j = 0; j < node[i][2].length; j++) {
          if (node[i][2][j][0] === 's') {
            node[i][2][j][1] = node[i][2][j][1] === '\n'
              ? '\n  '
              : '\n    ';
          }
        }
      }
      pretty.push(node[i]);
    }
    pretty.push(['s', '\n'])
    return pretty;
  }

};

},{}],45:[function(require,module,exports){
module.exports = {

  test: function(name, nodes) {
    return name === 'atruleb';
  },

  process: function(node) {
    node.splice(2, 0, ['s', ' ']);
    return node;
  }

};

},{}],46:[function(require,module,exports){
module.exports = {

  test: function(name, nodes) {
    return name === 'block';
  },

  process: function(node) {
    var pretty = [];
    for (var i = 0; i < node.length; i++) {
      if (node[i][0] === 'declaration') {
        pretty.push(['s', '\n  ']);
      }
      pretty.push(node[i]);
    }
    pretty.push(['s', '\n']);
    return pretty;
  }

};

},{}],47:[function(require,module,exports){
module.exports = {

  test: function(name, nodes) {
    return name === 'block';
  },

  process: function(node) {
    if (node[node.length - 2] && node[node.length - 2][0] !== 'decldelim') {
      node.splice(node.length - 1, 0, ['decldelim']);
    }
    return node;
  }

};

},{}],48:[function(require,module,exports){
module.exports = {

  test: function(name, nodes) {
    return name === 'atrulerq';
  },

  process: function(node) {
    node.push(['s', ' ']);
    return node;
  }

};

},{}],49:[function(require,module,exports){
module.exports = {

  test: function(name, nodes) {
    return name === 'selector';
  },

  process: function(node) {
    for (var i = 0; i < node.length; i++) {
      if (node[i][0] === 'simpleselector') {
        if (node[i + 1] && node[i + 1][0] === 'delim') {
          if (i > 1) {
            node[i].splice(1, 0, ['s', ' ']);
          }
        } else {
          if (i > 1) {
            node[i].splice(1, 0, ['s', ' ']);
          }
          node[i].push(['s', ' ']);
        }
      }
    }
    return node;
  }

};

},{}],50:[function(require,module,exports){
module.exports = {

  test: function(name, nodes) {
    return name === 'stylesheet';
  },

  process: function(node) {
    var pretty = [];
    for (var i = 0; i < node.length; i++) {
      if (i > 0 && node[i][0] !== 's') {
        pretty.push(['s', '\n']);
        pretty.push(node[i]);
        pretty.push(['s', '\n']);
      } else {
        pretty.push(node[i]);
      }
    }
    pretty.push(['s', '\n']);
    return pretty;
  }

};

},{}],51:[function(require,module,exports){
module.exports = {

  test: function(name, nodes) {
    return name === 'value';
  },

  process: function(node) {
    node.splice(1, 0, ['s', ' ']);
    return node;
  }

};

},{}],52:[function(require,module,exports){
// parser
var gonzo = require('gonzales-ast');

function uglyfyAST(ast) {
  return gonzo.traverse(ast, [
    require('./ugly/space-adjacent'),
    require('./ugly/space-functions'),
    require('./ugly/space-trim'),
    require('./ugly/space-single'),
    require('./ugly/space-delimiter'),
    require('./ugly/space-rulesets'),
    require('./ugly/space-attribs'),
    require('./ugly/space-important'),
    require('./ugly/space-mq'),
    require('./ugly/space-at-block'),
    require('./ugly/space-values'),
    require('./ugly/space-selectorops'),
    require('./ugly/ie-pseudo-fix'),
    require('./ugly/dedup-delimiters'),
    require('./ugly/last-delimiter')
  ]);
}

function uglyAST(ast) {
  ast = gonzo.traverse(ast, [
    require('./ugly/comments')
  ]);

  return uglyfyAST(ast);
}

function prettyAST(ast) {
  ast = uglyfyAST(ast);
  return gonzo.traverse(ast, [
    require('./pretty/tops'),
    require('./pretty/blocks'),
    require('./pretty/at'),
    require('./pretty/at-block'),
    require('./pretty/value'),
    require('./pretty/last-delimiter'),
    require('./pretty/selector'),
    require('./pretty/mq')
  ]);
}

exports.ugly = function ugly(css) {
  var ast = gonzo.parse(css);
  ast = uglyAST(ast);
  return gonzo.toCSS(ast);
};

exports.pretty = function pretty(css) {
  var ast = gonzo.parse(css);
  ast = prettyAST(ast);
  return gonzo.toCSS(ast);
};

exports.uglyAST = uglyAST;
exports.prettyAST = prettyAST;
exports.util = require('./util');
exports.visitors = {
  ugly: []
};

[
  'comments',
  'space-functions',
  'space-trim',
  'space-single',
  'space-delimiter',
  'space-rulesets',
  'space-attribs',
  'space-important',
  'space-mq',
  'space-at-block',
  'space-values',
  'space-selectorops',
  'ie-pseudo-fix',
  'dedup-delimiters',
  'last-delimiter'
].forEach(function(m) {
  exports.visitors.ugly[m] = require('./ugly/' + m);
})
},{"./pretty/at":45,"./pretty/at-block":44,"./pretty/blocks":46,"./pretty/last-delimiter":47,"./pretty/mq":48,"./pretty/selector":49,"./pretty/tops":50,"./pretty/value":51,"./ugly/comments":53,"./ugly/dedup-delimiters":54,"./ugly/ie-pseudo-fix":55,"./ugly/last-delimiter":56,"./ugly/space-adjacent":57,"./ugly/space-at-block":58,"./ugly/space-attribs":59,"./ugly/space-delimiter":60,"./ugly/space-functions":61,"./ugly/space-important":62,"./ugly/space-mq":63,"./ugly/space-rulesets":64,"./ugly/space-selectorops":65,"./ugly/space-single":66,"./ugly/space-trim":67,"./ugly/space-values":68,"./util":69,"gonzales-ast":32}],53:[function(require,module,exports){
module.exports = {

  test: function(name, nodes) {
    return name === 'comment';
  },

  process: function(node) {

    var text = node[1];

    // important comments
    if (text.charAt(0) === '!') {
      // trim trailing space
      node[1] = text.trim();
      return node;
    }

    // ie mac hack ends
    if (this.ie5machack) { 
      this.ie5machack = false;
      node = ['raw', '/**/'];
      return node;
    }

    // ie5 mac hack starts
    if (text.charAt(text.length - 1) === '\\') {
      this.ie5machack = true;
      node[1] = '\\'; // minify the hack
      return node;
    }

    // return nothing, delete the comment
  },
  
  ie5machack: false

};

},{}],54:[function(require,module,exports){
module.exports = {

  test: function(name, nodes) {
    return name === 'block';
  },

  process: function(node) {
    var delim_added = false;
    var decl_found = false;
    return node.filter(function(n) {

      if (n[0] === 'declaration') {
        decl_found = true;
      }

      if (n[0] !== 'decldelim') {
        delim_added = false;
        return true;
      }
      if (delim_added) {
        return false;
      }

      if (!decl_found) { // leading delimiter, forget it
        return false;
      }

      delim_added = true;
      return true;
    });
  }

};

},{}],55:[function(require,module,exports){
// add space after first-(line|letter)

module.exports = {

  test: function(name, nodes) {
    return name === 'pseudoc' || name === 'pseudoe';
  },

  process: function(node) {
    var val = node[1][1];
    if (val === 'first-line' || val === 'first-letter') {
      node[1][1] += ' ';
    }
    return node;
  }
};

},{}],56:[function(require,module,exports){
module.exports = {

  test: function(name, nodes) {
    return name === 'block';
  },

  process: function(node) {
    if (node[node.length - 1][0] === 'decldelim') {
      node.pop();
    }
    return node;
  }

};

},{}],57:[function(require,module,exports){
var util = require('../util.js');

module.exports = {

  test: function(name, nodes) {
    return (
      name === 'block' ||
      name === 'simpleselector' ||
      name === 'value'
    );
  },

  process: function(node) {

    for (var i = 1; i < node.length; i++) {
      if (node[i][0] === 's') {
        if (node[i - 1] && node[i - 1][0] === 's') {
          node.splice(i, 1);
        }
      }
    }

    return node;
  }

};

},{"../util.js":69}],58:[function(require,module,exports){
var util = require('../util.js');

module.exports = {

  test: function(name, nodes) {
    return name === 'atruleb';
  },

  process: function(node) {
    for (var i = 1; i < node.length; i++) {
      if (node[i][0] === 'block') {
        util.trimPrevNext(node, i);
      }
    }

    return node;
  }

};

},{"../util.js":69}],59:[function(require,module,exports){
var util = require('../util.js');

module.exports = {

  test: function(name, nodes) {
    return name === 'attrib';
  },

  process: function(node) {
    for (var i = 1; i < node.length; i++) {
      if (node[i][0] === 'attrselector') {
        util.trimPrevNext(node, i);
      }
    }
    return node;
  }

};

},{"../util.js":69}],60:[function(require,module,exports){
var util = require('../util.js');

module.exports = {

  test: function(name, nodes) {
    return name === 'block';
  },

  process: function(node) {
    for (var i = 1; i < node.length; i++) {
      if (node[i][0] === 'decldelim') {
        util.trimPrevNext(node, i);
      }
    }
    return node;
  }

};

},{"../util.js":69}],61:[function(require,module,exports){
var util = require('../util.js');

module.exports = {

  test: function(name, nodes) {
    return name === 'funktion';
  },

  process: function(node) {
    util.trim(node[2]);

    for (var i = 1; i < node[2].length; i++) {
      if (node[2][i][0] === 's') {
        if (util.aroundOperator(node[2], i)) {
          node[2].splice(i, 1);
        }
      }
    }

    return node;
  }

};

},{"../util.js":69}],62:[function(require,module,exports){
var util = require('../util.js');

module.exports = {

  test: function(name, nodes) {
    return name === 'value';
  },

  process: function(node) {
    for (var i = 1; i < node.length; i++) {
      if (node[i][0] === 'important') {
        util.trimPrevNext(node, i);
      }
    }
    return node;
  }

};

},{"../util.js":69}],63:[function(require,module,exports){
var util = require('../util.js');

module.exports = {

  test: function(name, nodes) {
    return name === 'atrulerq';
  },

  process: function(node) {

    if (node[1][0] === 's' && node[2][0] === 'braces') {
      util.trim(node);
    } else {
      util.trimRight(node);
    }

    for (var i = 1; i < node.length; i++) {
      if (node[i][0] === 'operator') {
        util.trimPrevNext(node, i);
      }
    }

    return node;
  }

};

},{"../util.js":69}],64:[function(require,module,exports){
var util = require('../util.js');

module.exports = {

  test: function(name, nodes) {
    return name === 'stylesheet' || name === 'atrulers';
  },

  process: function(node) {
    var newnode = [];
    newnode.push(node[0]);
    for (var i = 1; i < node.length; i++) {
      if (node[i][0] !== 's') {
        newnode.push(node[i]);
      }
    }
    return newnode;
  }

};

},{"../util.js":69}],65:[function(require,module,exports){
var util = require('../util.js');

module.exports = {

  test: function(name, nodes) {
    return name === 'simpleselector';
  },

  process: function(node) {
    for (var i = 1; i < node.length; i++) {
      if (node[i][0] === 'combinator') {
        util.trimPrevNext(node, i);
      }
    }
    return node;
  }

};

},{"../util.js":69}],66:[function(require,module,exports){
module.exports = {

  test: function(name, nodes) {
    return name === 's';
  },

  process: function(node) {
    node[1] = ' ';
    return node;
  }

};

},{}],67:[function(require,module,exports){
var util = require('../util.js');

module.exports = {

  test: function(name, nodes) {
    return (
      name === 'stylesheet' ||
      name === 'ruleset' ||
      name === 'block' ||
      name === 'selector' ||
      name === 'simpleselector' ||
      name === 'declaration' ||
      name === 'property' ||
      name === 'value' ||
      name === 'atrules' ||
      name === 'atrulers' ||
      name === 'atkeyword' ||
      name === 'braces'
    );
  },

  process: function(node) {
    util.trim(node);
    
    // special case, these have two more "intro" nodes, namely ( and )
    if (node[0] === 'braces') { 
      util.trimBraces(node);
    }
    
    return node;
  }

};

},{"../util.js":69}],68:[function(require,module,exports){
var util = require('../util.js');

module.exports = {

  test: function(name, nodes) {
    return name === 'value' || name === 'braces';
  },

  process: function(node) {
    for (var i = 1; i < node.length; i++) {
      if (node[i][0] === 's') {
        if (util.aroundOperator(node, i)) {
          node.splice(i, 1);
        }
      }
    }
    return node;
  }

};

},{"../util.js":69}],69:[function(require,module,exports){
exports.trim = function trim(ast) {
  if (ast.length < 2) {
    return; // already empty, nothing to trim
  }
  if (ast[ast.length - 1][0] === 's') {
    ast.pop();
  }
  if (ast[1] && ast[1][0] === 's') {
    ast.splice(1, 1);
  }
};

exports.trimRight = function trim(ast) {
  if (ast.length < 2) {
    return; // already empty, nothing to trim
  }
  if (ast[ast.length - 1][0] === 's') {
    ast.pop();
  }
};

exports.trimBraces = function trim(ast) {
  if (ast.length < 4) {
    return; // already empty, nothing to trim
  }
  if (ast[3] && ast[3][0] === 's') {
    ast.splice(3, 1);
  }
};

exports.trimPrevNext = function trim(node, i) {
  var prev = node[i - 1];

  if (prev && prev[0] === 's') {
    node.splice(i - 1, 1)
    i--;
  }
  var next = node[i + 1];
  if (next && next[0] === 's') {
    node.splice(i + 1, 1);
  }
};

exports.aroundOperator = function aroundOperator(node, i) {
  var prev = node[i - 1];
  var next = node[i + 1];
  return (
    (prev && prev[0] === 'operator') ||
    (next && next[0] === 'operator') ||
    (prev && prev[0] === 'ident' && prev[1] === '*') ||
    (next && next[0] === 'ident' && next[1] === '*')
  );
};

},{}],70:[function(require,module,exports){
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


},{"../index.js":71,"bscss":1,"gzip-js":38,"prettyugly":43}],71:[function(require,module,exports){
module.exports = require('./lib/shrink.js');


},{"./lib/shrink.js":72}],72:[function(require,module,exports){
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

},{"./visitors/@charset.js":74,"./visitors/@import.js":75,"./visitors/@keyframes.js":76,"./visitors/angle.js":77,"./visitors/color-functions.js":78,"./visitors/color-hex.js":79,"./visitors/color-names.js":80,"./visitors/dedup-declarations.js":81,"./visitors/dedup-keyframes.js":82,"./visitors/dedup-selectors.js":83,"./visitors/empty-blocks.js":84,"./visitors/empty-media.js":85,"./visitors/font-family-generic.js":86,"./visitors/font-family-unquote.js":87,"./visitors/font-weight.js":88,"./visitors/lowercase-dimensions.js":89,"./visitors/lowercase-props.js":90,"./visitors/merge-blocks-in-blocks.js":91,"./visitors/merge-blocks.js":92,"./visitors/merge-media.js":93,"./visitors/numbers.js":94,"./visitors/pseudo-elements.js":95,"./visitors/quotes.js":96,"./visitors/time.js":97,"./visitors/unary.js":98,"./visitors/uri.js":99,"./visitors/zero-dimensions.js":100,"./visitors/zero-percentage.js":101,"gonzales-ast":32,"prettyugly":43}],73:[function(require,module,exports){
function stripslashes(str) {
  return str.replace(/\\(.?)/g, function(match, sym) {
    return sym === '"' || sym === "'"
      ? sym
      : match;
  });
}

exports.stripslashes = stripslashes;

exports.addslashes = function addslashes(str, q) {
  str = stripslashes(str);
  return str.replace(new RegExp(q, 'g'), '\\' + q);
};

exports.unfix = function unfix(str) {
  return str.toLowerCase().replace(/^\-(ms|webkit|moz|o)\-/, '');
};

exports.stripLeadingZero = function stripLeadingZero(n) {
  // strip leading 0.
  if (n > 0 && n < 1) {
    n = String(n).replace('0.', '.');
  }
  return String(n);
}
},{}],74:[function(require,module,exports){
// only one charset allowed per file
// find the first and hoist it to the top
// delete all others
// this is often a side effect of concatenating files

module.exports = {

  test: function(name, nodes) {
    return name === 'stylesheet';
  },

  process: function(node) {
    var newnode = [];
    newnode.push(node[0]);
    var charsetnode = null;

    for (var i = 1; i < node.length; i++) {
      if (node[i][0] === 'atrules' && node[i][1][0] === 'atkeyword' && node[i][1][1][1] === 'charset') {
        if (!charsetnode) {
          charsetnode = node[i][3];
        }
      } else {
        newnode.push(node[i]);
      }
    }

    if (charsetnode) {
      var ch = ["atrules", ["atkeyword", ["ident", "charset"]], ["s", " "], charsetnode];
      newnode.splice(1, 0, ch);
    }
    return newnode;
  }

};

},{}],75:[function(require,module,exports){
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
},{"../util":73}],76:[function(require,module,exports){
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

},{"../util":73}],77:[function(require,module,exports){
var stripLeadingZero = require('../util').stripLeadingZero;
var these = ['deg', 'grad', 'turn', 'rad'];

var PRECISION = 2;

// prefer `deg` if all else is equal

module.exports = {

  test: function(name, nodes) {
    return name === 'dimension';
  },

  process: function(node) {
    var value = Number(node[1][1]);
    var unit = node[2][1];
    if (isNaN(value) || these.indexOf(unit) === -1) {
      return node;
    }

    if (value === 0) {
      node[1][1] = '0';
      node[2][1] = 'deg';
      return node;
    }

    var all = {
      deg: 0,
      grad: 0,
      turn: 0,
      rad: 0
    };

    var min = getMin(populate(value, unit));
    node[1][1] = min.value;
    node[2][1] = min.unit;
    return node;
  }

};

var fullcircle = {
  turn: 1,
  deg: 360,
  grad: 400,
  rad: 2 * Math.PI
};

function populate(v, u) {
  var all = {}
  for (var i in fullcircle) {
    all[i] = 1 * Number(v * fullcircle[i] / fullcircle[u]).toFixed(PRECISION);
  }
  return all;
}

function getMin(all) {
  var win = {
    value: stripLeadingZero(all.deg),
    unit: 'deg'
  };
  var champion = (win.value + win.unit).length;
  for (var u in all) {
    if (u === 'turn') {
      continue; // lacking browser support
    }
    var challenger = (stripLeadingZero(all[u]) + u).length;
    if (challenger < champion) {
      champion = challenger;
      win = {
        value: stripLeadingZero(all[u]),
        unit: u
      };
    }
  }
  return win;
}
},{"../util":73}],78:[function(require,module,exports){
var min = require('csscolormin').min;

function stringify(node) {
  var str = ''
  for (var i = 1; i < node.length; i++) {
    if (node[i][0] === 'number') {
      str += node[i][1];
    } else if (node[i][0] === 'operator' && node[i][1] === ',') {
      str += ',';
    } else if (node[i][0] === 'percentage') {
      str += node[i][1][1] + '%';
    }
  }
  return str;
}

var functions = [
  'rgb',
  'rgba',
  'hsl',
  'hsla',
  'cmyk',
  'hsv',
  'hsva'
];

module.exports = {

  test: function(name, nodes) {
    return name === 'funktion' && functions.indexOf(nodes[1]) !== -1;
  },

  process: function(node) {
    var colorstr = node[1][1] + '(' + stringify(node[2]) + ')';
    return ["raw", min(colorstr)];
  }

};

},{"csscolormin":17}],79:[function(require,module,exports){
var min = require('csscolormin').min;

module.exports = {

  test: function(name, nodes) {
    return name === 'vhash';
  },

  process: function(node) {
    return ["raw", min('#' + node[1])];
  }

};

},{"csscolormin":17}],80:[function(require,module,exports){
var keywords = require('csscolormin').keywords;

var props = [
  'color',
  'background',
  'background-color',
  'background-image',
  'border',
  'border-color',
  'border-top',
  'border-right',
  'border-bottom',
  'border-left',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'outline',
  'outline-color',
  'text-shadow',
  'box-shadow'
];

module.exports = {

  test: function(name, nodes) {
    return name === 'declaration' && props.indexOf(nodes[1][1]) !== -1;
  },

  process: function(node) {
    for (var i = 1; i < node[2].length; i++) {
      if (node[2][i][0] === 'ident' && keywords[node[2][i][1]]) {
        node[2][i] = ['raw', keywords[node[2][i][1]]];
      } else if (node[2][i][0] === 'funktion' && node[2][i][1][1].indexOf('gradient') !== 1) {
        node[2][i] = this.process(node[2][i]);
      }
    }
    return node;
  },


};

},{"csscolormin":17}],81:[function(require,module,exports){
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
},{}],82:[function(require,module,exports){
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

},{"../util":73}],83:[function(require,module,exports){
module.exports = {

  test: function(name, nodes) {
    return name === 'selector';
  },

  process: function(node) {
    var selectors = {};
    var newnode = [];
    newnode.push(node[0]);

    for (var i = 1; i < node.length; i++) {
      if (node[i][0] === 'simpleselector') {
        selectors[JSON.stringify(node[i])] = node[i];
      }
    }

    var keys = Object.keys(selectors);
    keys.forEach(function(k, idx) {
      newnode.push(selectors[k]);
      if (idx < keys.length - 1) {
        newnode.push(['delim']);
      }
    });

    return newnode;
  }

};

},{}],84:[function(require,module,exports){
module.exports = {

  test: function(name, nodes) {
    return name === 'ruleset';
  },

  /*
  a {  ; ; ; }

  ['stylesheet',
    ['ruleset',
      ['selector',
        ['simpleselector',
          ['ident', 'a'],
          ['s', ' ']]],
      ['block',
        ['s', '  '],
        ['decldelim'],
        ['s', ' '],
        ['decldelim'],
        ['s', ' '],
        ['decldelim'],
        ['s', ' ']]]]
  */

  process: function(node) {
    // spaces and trailing delims have been stripped
    // if there's nothing left, it's empty
    if (node[2].length < 2) { // 1st is the 'block' node
      return false;
    }
    // check for multiple ;s
    for (var i = 1; i < node[2].length; i++) {
      if (node[2][i][0] !== 'decldelim' && node[2][i][0] !== 's') {
        return node;
      }
    }

  }
};

},{}],85:[function(require,module,exports){
module.exports = {

  test: function(name, nodes) {
    return name === 'atruler' && nodes[0] === 'atkeyword' && nodes[1][1] === 'media';
  },

  process: function(node) {
    // node[3] == selectors in the media block
    if (node[3].length > 1) {
      return node;
    }
  }
};


/*
[ 'atruler',
  [ 'atkeyword', [ 'ident', 'media' ] ],
  [ 'atrulerq', [ 's', ' ' ], [ 'ident', 'print' ], [ 's', ' ' ] ],
  [ 'atrulers' ] ]
*/
},{}],86:[function(require,module,exports){
// non-generic fonts don't make sense after a generic one

var generic = [
  'sans-serif',
  'serif',
  'fantasy',
  'cursive',
  'monospace'
];

module.exports = {

  test: function(name, nodes) {
    return name === 'declaration' && nodes[1][1] === "font-family";
  },

  process: function(node) {
    var newnode = [node[0], node[1], [node[2][0]]];
    var generic_found = false;

    for (var i = 1; i < node[2].length; i++) {

      if (node[2][i][0] === 'important') {
        newnode[2].push(node[2][i]);
        return newnode;
      }

      var value = node[2][i][1].toLowerCase();
      if (!generic_found && generic.indexOf(value) !== -1) {
        generic_found = true;
        node[2][i][1] = value; // lowercase generic
        newnode[2].push(node[2][i]);
      }
      if (!generic_found) {
        newnode[2].push(node[2][i]);
      }

    }
    return newnode;
  }
};


},{}],87:[function(require,module,exports){
module.exports = {

  test: function(name, nodes) {
    return name === 'declaration' && nodes[1][1] === "font-family";
  },

  process: function(node) {
    for (var i = 1; i < node[2].length; i++) {
      if (node[2][i][0] === 'string') { // try to unquote
        var raw = node[2][i][1].slice(1, -1); // sans quotes
        // strip spaces, the rest should be just letters or -
        if (/^[a-z-]*$/i.test((raw.replace(/\s/g, '')))) {
          node[2][i] = ['raw', raw];
        }
      }
    }
    return node;
  }
};


},{}],88:[function(require,module,exports){
module.exports = {

  test: function(name, nodes) {
    return name === 'declaration' && nodes[1][1] === "font-weight";
  },

  process: function(node) {
    if (node[2][1][1] === 'bold') {
      node[2][1][1] = 700;
    } else if (node[2][1][1] === 'normal') {
      node[2][1][1] = 400;
    }
    return node;
  }
};


/*
['stylesheet',
  ['ruleset',
    ['selector',
      ['simpleselector',
        ['ident', 'a']]],
    ['block',
      ['declaration',
        ['property',
          ['ident', 'font-weight']],
        ['value',
          ['ident', 'bold']]],
      ['decldelim']]]]
*/
},{}],89:[function(require,module,exports){
module.exports = {

  test: function(name, nodes) {
    return name === 'dimension';
  },

  process: function(node) {
    node[2][1] = node[2][1].toLowerCase();
    return node;
  }

};

},{}],90:[function(require,module,exports){
module.exports = {

  test: function(name, nodes) {
    return name === 'property';
  },

  process: function(node) {
    node[1][1] = node[1][1].toLowerCase();
    return node;  
  }

};

},{}],91:[function(require,module,exports){
// same as merging blocks in a stylesheet
// only it's in a media query block

module.exports = {

  test: function(name, nodes) {
    return name === 'atrulers';
  },
  process: require('./merge-blocks.js').process
};

},{"./merge-blocks.js":92}],92:[function(require,module,exports){
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
},{}],93:[function(require,module,exports){
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
},{}],94:[function(require,module,exports){
var stripLeadingZero = require('../util').stripLeadingZero;

module.exports = {

  test: function(name, nodes) {
    return name === 'number';
  },

  process: function(node) {
    var n = Number(node[1]);
    if (isNaN(n)) {
      return; // drop this
    }

    node[1] = stripLeadingZero(n);
    return node;
  }

};

},{"../util":73}],95:[function(require,module,exports){
var whitelist = [
  'after',
  'before',
  'first-letter',
  'first-line'
];

module.exports = {

  test: function(name, nodes) {
    return name === 'pseudoe';
  },

  process: function(node) {
    var name = node[1][1];
    if (whitelist.indexOf(name.trim()) !== -1) {
      node[0] = 'pseudoc';
    }
    return node;
  }
};

},{}],96:[function(require,module,exports){
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


},{"../util":73}],97:[function(require,module,exports){
var stripLeadingZero = require('../util').stripLeadingZero;

module.exports = {

  test: function(name, nodes) {
    return name === 'dimension';
  },

  process: function(node) {
    var u = node[2][1];
    if (u !== 'ms' && u !== 's') {
      return node;
    }
    var ms_value = u === 'ms'
      ? node[1][1]
      : node[1][1] * 1000;

    var seconds = stripLeadingZero(ms_value / 1000);
    var milisec = stripLeadingZero(ms_value);
    if (milisec.length + 2 > seconds.length + 1) { // ms=2,s=1
      node[2][1] = 's';
      node[1][1] = seconds;
    } else {
      node[2][1] = 'ms';
      node[1][1] = milisec;
    }
    return node;
  }

};

},{"../util":73}],98:[function(require,module,exports){
module.exports = {

  test: function(name, nodes) {
    return name === 'value';
  },

  process: function(node) {
    var newnode = [];

    for (var i = 0; i < node.length; i++) {
      var type = node[i][0];
      var next_type = node[i + 1] && node[i + 1][0];

      if (type !== 'unary') {
        newnode.push(node[i]);
        continue; // no changes
      }

      if (next_type !== 'dimension' && next_type !== 'number') {
        newnode.push(node[i]);
        continue; // no changes
      }

      if (node[i][1] === '+') {
        continue; //  +101 => 101, +1px => 1px
      }

      if (next_type === 'number' && node[i + 1][1] === '0') {
        continue; // -0 => 0
      }

      newnode.push(node[i]);
    }

    return newnode;
  }

};

},{}],99:[function(require,module,exports){
var trim = require('prettyugly').util.trim;

module.exports = {

  test: function(name, nodes) {
    return name === 'uri';
  },

  process: function(node) {
    trim(node);

    if (node[1][0] === 'string') { // as opposed to "raw" which is unquoted url
      // try to unquote
      var raw = node[1][1].slice(1, -1);
      if (/[\s\(\)"']/.test(raw)) {
        return node;
      }
      node[1] = ['raw', raw];
    }

    //var colorstr = node[1][1] + '(' + stringify(node[2]) + ')';
    //return ["string", min(colorstr)];
    return node;
  }

};

},{"prettyugly":43}],100:[function(require,module,exports){
var angle = ['deg', 'grad', 'turn', 'rad'];
var time = ['ms', 's'];

module.exports = {

  test: function(name, nodes) {
    return name === 'dimension';
  },

  process: function(node) {
    if (node[1][1] !== '0') {
      return node;
    }

    if (angle.indexOf(node[2][1]) !== -1) {
      node[2][1] = 'deg';
      return node;
    }

    if (time.indexOf(node[2][1]) !== -1) {
      node[2][1] = 's';
      return node;
    }

    return ['number', '0'];
  }

};

},{}],101:[function(require,module,exports){
module.exports = {

  test: function(name, nodes) {
    return name === 'percentage';
  },

  process: function(node) {
    if (node[1][1] !== '0') {
      return node;
    }
    return ['number', '0'];
  }

};

},{}]},{},[70])