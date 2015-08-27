var _ = require('underscore');
var numeric = require('numeric');
var convnetjs = require('convnetjs');
var config = require('./config');
var glove = require('./glove');
var timing = require('./timing');

config.addOption('gen_rules', true, 'boolean');


var argmax = function(list, key, n) {
  n = n || 1;
  key = key || function(value) {return value;};

  return _.chain(list).
           sortBy(function(value, i, orig) { return -key(value, i, orig); }).
           value().
           slice(0, n);
};

module.exports = new (function() {
  var baselines = this;

  /*
   * A silly baseline learner that cannot be trained and
   * simply predicts the first possibility (essentially
   * random guessing, since the domain is shuffled).
   */
  this.DummyBaseline = function(options) {
    // "gen_rules": apply a few simple rules to make generation better
    this.genRules = options.gen_rules;
  };
  this.DummyBaseline.prototype = {
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


  /*
   * A shallow neural net classifier with a GloVe bag of words (sum of word
   * embeddings) as features.
   */
  this.GloveSumBaseline = function(options) {
  };
  this.GloveSumBaseline.prototype = {
    train: function(data) {
      var learner = this;

      var x = [];
      var y = [];

      this.featIndex = 0;
      this.featMap = {};
      _.each(data, function(example) {
        _.each(example.context.domain, function(entity) {
          _.each(entity, function(featName) {
            if (!(featName in learner.featMap)) {
              learner.featMap[featName] = learner.featIndex;
              learner.featIndex++;
            }
          });
        });
      });

      _.each(data, function(example) {
        var gloveSum = learner.getGloveSum(example.input);

        _.each(example.context.domain, function(entity, i) {
          var attrFeats = learner.featurizeAttributes(entity);
          var feats = gloveSum.concat(attrFeats);
          var outputClass = (example.output.indexOf(i) > -1 ? 1 : 0);
          x.push(feats);
          y.push(outputClass);
        });
      });

      var inputDim = x[0].length;

      this.net = new convnetjs.Net();
      this.net.makeLayers([{type: 'input', out_sx: 1, out_sy: 1, out_depth: inputDim},
                           {type: 'fc', num_neurons: inputDim / 2, activation: 'tanh'},
                           {type: 'softmax', num_classes: 2}]);

      // TODO: extract params, numIters to command line arguments
      var trainer = new convnetjs.Trainer(this.net, {
        method: 'adadelta',
        l2_decay: 0.001,
        batch_size: 10
      });
      var numEpochs = 2;
      timing.startTask('epoch', numEpochs);
      for (var epoch = 0; epoch < numEpochs; epoch++) {
        timing.progress(epoch);
        timing.startTask('example', x.length);
        for (var i = 0; i < x.length; i++) {
          timing.progress(i);
          var xVol = new convnetjs.Vol(1, 1, x[i].length);
          xVol.w = x[i];
          trainer.train(xVol, y[i]);
        }
        timing.endTask();
      }
      timing.endTask();

      return {params: this.net.toJSON()};
    },

    featurizeAttributes: function(entity) {
      var learner = this;
      var featurized = numeric.rep([learner.featIndex], 0);

      _.each(entity, function(attr) {
        if (attr in learner.featMap) {
          // should always be true for the train set, but we want to
          // handle new features at test time without crashing
          featurized[learner.featMap[attr]] = 1;
        }
      });

      return featurized;
    },

    getGloveSum: function(description) {
      var gloveDim = glove.VECTORS['word'].length;
      var vecs = _.map(description.split(' '), function(word) {
        if (word in glove.VECTORS) {
          return _.toArray(glove.VECTORS[word]);
        } else {
          return numeric.rep([gloveDim], 0);
        }
      });
      return numeric.add.apply(numeric, vecs);
    },

    predict: function(example) {
      if (example.context.generation) {
        // TODO
        return baselines.DummyBaseline.prototype.predict(example);
      }

      var learner = this;

      var domain = example.context.domain;

      // TODO: refactor this duplicated code
      var gloveSum = learner.getGloveSum(example.input);

      var featurized = [];
      _.each(example.context.domain, function(entity, i) {
        var attrFeats = learner.featurizeAttributes(entity);
        var feats = gloveSum.concat(attrFeats);
        featurized.push(feats);
      });

      var scores = _.range(featurized.length).map(function(i) {
        var xVol = new convnetjs.Vol(featurized[i]);
        return learner.net.forward(xVol).w[1];
      });
      //console.log(scores);

      if (example.context.number !== undefined) {
        return argmax(_.range(scores.length),
                      _.propertyOf(scores),
                      example.context.number);
      } else {
        var positive = _.chain(_.range(scores.length)).
                         filter(function(i) { scores[i] >= 0.5; }).
                         value();
        if (positive.length > 0) {
          return positive;
        } else {
          return argmax(_.range(scores.length),
                        _.propertyOf(scores));
        }
      }
    },
  };
})();
