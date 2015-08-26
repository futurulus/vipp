var _ = require('underscore');
var config = require('./config.js');

config.addOption('gen_rules', true, 'boolean');

module.exports = new (function() {
  var learner = this;

  /*
   * A silly baseline learner that cannot be trained and
   * simply predicts the first possibility.
   */
  this.DummyLearner = function(options) {
    // "gen_rules": apply a few simple rules to make generation better
    this.genRules = options.gen_rules;
  };
  this.DummyLearner.prototype = {
    train: function(data) {
      return {};
    },

    predict: function(example) {
      if (example.context.generation) {
        if (this.genRules) {
          return _.chain(example.annotatedInput).
                   flatten().
                   map(function (attr) {
                     var pair = attr.split(":");
                     if (pair[0].indexOf('has') === 0) {
                       var attribute = pair[0].substring(3).toLowerCase();
                       return (pair[1] === '1' ? "no " : "") + attribute;
                     } else {
                       var value = pair[1].trim();
                       if (!(/^\d+$/.test(value))) return value;
                     }
                   }).
                   compact().
                   value().
                   join(" ");
        } else {
          return _.chain(example.annotatedInput).
                   flatten().
                   map(function (attr) { return attr.trim().split(':'); }).
                   flatten().
                   value().
                   join(" ");
        }
      } else if (example.context.number !== undefined) {
        return _.range(example.context.number);
      } else {
        return [0];
      }
    },
  };
})();
