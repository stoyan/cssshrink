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

## Grunt task

A grunt task is avaiable as here [grunt-cssshrink](https://github.com/JohnCashmore/grunt-cssshrink)
