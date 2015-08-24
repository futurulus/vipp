var numeric = require('numeric');
var Counter = require('pycollections').Counter;
var _ = require('underscore');

module.exports = new (function() {
  var metrics = this;

  this.multisetDice = function(a, b) {
    // Accepts a pair as well
    if (b === undefined) {
      b = a[1];
      a = a[0];
    }

    var counts1 = new Counter(a);
    var counts2 = new Counter(b);
    var num = 2 * numeric.sum(counts1.items().map(function(attrPair) {
      var key = attrPair[0];
      var count = attrPair[1];
      return Math.min(count, counts2.get(key));
    }));
    var den = a.length + b.length;
    return num / den;
  };

  this.instanceAccuracy = function(a, b) {
    // Accepts a pair as well
    if (b === undefined) {
      b = a[1];
      a = a[0];
    }

    return _.isEqual(a, b) ? 1 : 0;
  };

  this.meanMultisetDice = function meanMultisetDice(xs, ys) {
    var instanceDices = _.zip(xs, ys).map(function(pair) {
      return metrics.multisetDice(pair);
    });
    return numeric.sum(instanceDices) / instanceDices.length;
  };

  this.accuracy = function accuracy(xs, ys) {
    var instanceAccs = _.zip(xs, ys).map(function(pair) {
      return metrics.instanceAccuracy(pair);
    });
    return numeric.sum(instanceAccs) / instanceAccs.length;
  };
})();
