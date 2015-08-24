var PREFIX = 'rsa/data/tuna_';


var fs = require('fs');
var xml2js = require('xml2js');
var glob = require('glob').sync;

var read = function(filename) {
  return fs.readFileSync(filename, 'utf8');
};
var write = function(filename, data) {
  return fs.writeFileSync(filename, data, 'utf8');
};

var parseXml = function(xmlStr) {
  var xmlObj;
  xml2js.parseString(xmlStr, function (err, result) {
    if (err) {
      throw err;
    }
    xmlObj = result;
  });
  return xmlObj;
};

var tagToPropertyName = function(tag) {
  return tag.toLowerCase().replace(/-(.)/g,
      function(match, p1, offset, string) {
        return p1.toUpperCase();
      });
};

var isArray = function(obj) {
  return Object.prototype.toString.call(obj) === '[object Array]';
};

var isObject = function(obj) {
  return obj === Object(obj);
};

var convertTree = function(source) {
  if (isArray(source)) {
    if (source.length == 1) {
      return convertTree(source[0]);
    }

    var result = [];
    for (var i = 0; i < source.length; i++) {
      result.push(convertTree(source[i]));
    }
    return result;
  } else if (isObject(source)) {
    var result = {};
    inheritProperties(result, source);
    return result;
  } else {
    return source;
  }
};

var inheritProperties = function(obj, source) {
  for (var key in source) {
    if (key !== '$' && source.hasOwnProperty(key)) {
      obj[tagToPropertyName(key)] = convertTree(source[key]);
    }
  }

  if (source.hasOwnProperty('$')) {
    for (var key in source.$) {
      if (tagToPropertyName(key) in obj) {
        obj['$' + tagToPropertyName(key)] = convertTree(source.$[key]);
      } else {
        obj[tagToPropertyName(key)] = convertTree(source.$[key]);
      }
    }
  }
};

var Trial = function(filename) {
  'use strict';
  if (this === undefined) return new Trial(filename);

  this.filename = filename;

  var tree = parseXml(read(filename)).TRIAL;
  inheritProperties(this, tree);

  return this;
};

var loadCorpus = function(corpusId) {
  var pathGlob = 'TUNA/corpus/' + corpusId + '/*.xml';
  var corpus = [];
  var trials = glob(pathGlob);
  process.stdout.write('Loading ' + pathGlob);
  for (var i = 0; i < trials.length; i++) {
    corpus.push(Trial(trials[i]));
    if (~~(i * 10 / trials.length) != ~~((i + 1) * 10 / trials.length)) {
      process.stdout.write('.');
    }
  }
  process.stdout.write(trials.length + ' trials loaded.\n');
  return corpus;
};

var count = ['singular', 'plural', '*'];
var domain = ['furniture', 'people', '*'];
for (var i = 0; i < count.length; i++) {
  for (var j = 0; j < domain.length; j++) {
    var trials = loadCorpus(count[i] + '/' + domain[j]);
    var outfile = PREFIX + count[i].replace('*', 'all') + '_' +
                           domain[j].replace('*', 'all') + '.json';

    // four dots because three is a sweet.js syntax error...wtf?
    process.stdout.write('Writing to ' + outfile + '....');

    write(outfile, JSON.stringify(trials));

    process.stdout.write('done.\n');
  }
}

return 'Conversion complete.';
