var numeric = require('numeric');
var Counter = require('pycollections').Counter;
var _ = require('underscore');

module.exports = new (function() {
  var metrics = this;

  this.multiset_dice = function(a, b) {
    // Accepts a pair as well
    if (b === undefined) {
      b = a[1];
      a = a[0];
    }

    var counts1 = new Counter(a);
    var counts2 = new Counter(b);
    var num = 2 * numeric.sum(counts1.items().map(function(attr_pair) {
      var key = attr_pair[0];
      var count = attr_pair[1];
      return Math.min(count, counts2.get(key));
    }));
    var den = a.length + b.length;
    return num / den;
  };

  this.instance_accuracy = function(a, b) {
    console.log(a + "; " + b);
    // Accepts a pair as well
    if (b === undefined) {
      b = a[1];
      a = a[0];
    }

    return _.isEqual(a, b) ? 1 : 0;
  };

  this.mean_multiset_dice = function(xs, ys) {
    var instance_dices = _.zip(xs, ys).map(function(pair) {
      return metrics.multiset_dice(pair);
    });
    console.log(instance_dices);
    return numeric.sum(instance_dices) / instance_dices.length;
  };

  this.accuracy = function(xs, ys) {
    var instance_accs = _.zip(xs, ys).map(function(pair) {
      return metrics.instance_accuracy(pair);
    });
    console.log(instance_accs);
    return numeric.sum(instance_accs) / instance_accs.length;
  };
})();
