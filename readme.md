CSS minifier

## Why

Because CSS is on the critical path to rendering pages. It must be small! Or else!

## Installation

    $ npm install cssshrink

## Usage

```js
  var cssshrink = require('cssshrink');
  var css =
    'a{color: #ff0000;}';
  css = cssshrink.shrink(css);
```

Result:

    a{color:red}

## Playground

Available at http://cssshrink.com

## More info

Slides at http://cssshrink.com/velocity

## Grunt and Gulp tasks

* [grunt-cssshrink](https://github.com/JohnCashmore/grunt-cssshrink) 
* [gulp-cssshrink](https://www.npmjs.org/package/gulp-cssshrink)
