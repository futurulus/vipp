#!/usr/bin/env node
'use strict';

var fs = require('fs');
var adtransform = require('./src/ad/transform.js').transform;
var ad = require('./src/ad/functions');
for (var prop in ad) {
  global[prop] = ad[prop];
}

function compile(code) {
  code = adtransform(code);
  console.log(code);
	return eval('(function() {\n' + code + '\n})\n');
}

var code = fs.readFileSync('examples/plusplus.js');
var fn = compile(code);
fn();
