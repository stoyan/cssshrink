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