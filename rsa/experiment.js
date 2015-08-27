var _ = require('underscore');
var jStat = require('jStat').jStat;
var config = require('./config');
var timing = require('./timing');

/* Number of decimal places of precision in output reporting. */
var PRECISION = 3;

var warn = function(msg) {
  if (console && console.warn) {
    console.warn(msg);
  } else if (console) {
    console.log(msg);
  }
}


module.exports = new (function() {
  var experiment = this;

  /*
   * Train and evaluate `learner` on `numFolds` cross-validation folds
   * from `data` (array of examples), and return statistics computed by
   * `metrics` (array of named functions) in the form of an object
   * mapping each metric name to a array containing the value
   * of the metric for each fold.
   *
   * Test sets of different folds for cross-validation are guaranteed to
   * be disjoint.
   */
  this.crossValidate = function(learner, data, metrics, numFolds) {
    var splitStats = [];
    timing.startTask('CV fold', numFolds);
    for(var split = 0; split < numFolds; split++) {
      timing.progress(split);
      var testStart = Math.floor(data.length * split / numFolds);
      var testEnd = Math.floor(data.length * (split + 1) / numFolds);
      var trainData = data.slice(0, testStart).concat(data.slice(testEnd));
      var testData = data.slice(testStart, testEnd);
      splitStats.push(experiment.trainTest(learner, trainData, testData, metrics, '.' + split));
    }
    timing.endTask();

    var combined = experiment.combineStats(splitStats);
    combined.experiment = numFolds + ' cross-validation folds';
    return combined;
  };

  /*
   * Train and evaluate `learner` on `numSplits` random train-test splits
   * from `data` (array of examples), and return statistics computed by
   * `metrics` (array of named functions) in the form of an object
   * mapping each metric name to a array containing the value
   * of the metric for each split.
   *
   * Because the train-test splits are random, the test sets are likely to
   * overlap between splits.
   */
  this.randomSplits = function(learner, data, metrics, numSplits, trainFrac) {
    var splitStats = [];
    var trainSize = Math.floor(data.length * trainFrac);
    timing.startTask('train-test split', numSplits);
    for (var split = 0; split < numSplits; split++) {
      timing.progress(split);
      var shuffled = _.shuffle(data);
      var trainData = _.first(shuffled, trainSize);
      var testData = _.rest(shuffled, trainSize);
      splitStats.push(experiment.trainTest(learner, trainData, testData, metrics, '.' + split));
    }
    timing.endTask();

    var combined = experiment.combineStats(splitStats);
    combined.experiment = numSplits + ' random splits, trainFrac=' + trainFrac;
    return combined;
  };

  /*
   * Train `learner` on `trainData` (array of examples), evaluate it on
   * `testData` (array of examples), and return statistics computed by
   * `metrics` (array of named functions) in the form of an object
   * mapping each metric name to a singleton array containing the value
   * of the metric.
   */
  this.trainTest = function(learner, trainData, testData, metrics, suffix) {
    var auxStats = learner.train(trainData);
    if (auxStats === undefined) auxStats = {};
    if ('params' in auxStats) {
      config.dump(auxStats.params, 'params' + (suffix ? suffix : ''));
      delete auxStats.params;
    }
    auxStats.trainSize = trainData.length;
    auxStats.testSize = testData.length;

    var trainGolds = _.map(trainData, function(example) { return example.output; });
    var trainPredictions = _.map(trainData, function(example) {
      var input = experiment.stripOutput(example);
      return learner.predict(input);
    })
    experiment.dumpPredictions(trainData, trainPredictions,
                               'predictions.train' + (suffix ? suffix : ''));

    var testGolds = _.map(testData, function(example) { return example.output; });
    var testPredictions = _.map(testData, function(example) {
      var input = experiment.stripOutput(example);
      return learner.predict(input);
    })
    experiment.dumpPredictions(testData, testPredictions,
                               'predictions.test' + (suffix ? suffix : ''));

    auxStats.experiment = 'Provided train/test split';
    var results = experiment.evaluatePredictions(trainPredictions, trainGolds,
                                                 metrics, 'train_', auxStats);
    return experiment.evaluatePredictions(testPredictions, testGolds,
                                          metrics, 'test_', results);
  };

  /*
   * Evaluate an array of `predictions` against an array of `golds` for each
   * metric in `metrics`, and return an object mapping each metric's name
   * prefixed with `prefix` to a singleton array containing the value of
   * the metric. If `auxStats` is given, copy its own properties into the
   * resulting object verbatim.
   */
  this.evaluatePredictions = function(predictions, golds, metrics, prefix, auxStats) {
    auxStats = auxStats || {};
    prefix = (prefix === undefined) ? '' : prefix;

    return _.chain(metrics).map(function(metric) {
      if (!metric.name) {
        warn('Metric has falsy name (is it an anonymous function?): ' + metric.name);
      }
      return [prefix + metric.name, [metric(predictions, golds)]];
    }).object().extendOwn(auxStats).value();
  };

  /*
   * Write out a one-JSON-per-line file to `filename` in the run
   * directory containing the examples in `data` with an added `prediction`
   * field containing the system's prediction from the argument `predictions`.
   * `data` and `predictions` should be arrays of the same length.
   */
  this.dumpPredictions = function(data, predictions, filename) {
    var zipped = _.zip(data, predictions).
                   map(function(pair) {
                     return _.extend(pair[0], {prediction: pair[1]});
                   });
    config.dump(zipped, filename, true);
  };

  /*
   * Combine an array of stats summary objects into one.
   *
   * > combineStats({f1: [0.5]}, {f1: [0.5]}, {f1: [1]})
   * {f1: [0.5, 0.5, 1]}
   */
  this.combineStats = function(statsArray) {
    return _.reduce(statsArray, function(a, b) {
      return _.chain(a).
               pairs().
               map(function(pair) {
                 var arrayA = _.isArray(pair[1]) ? pair[1] : [pair[1]];
                 var valueB = b[pair[0]];
                 var arrayB = _.isArray(valueB) ? valueB : [valueB];
                 return [pair[0], arrayA.concat(arrayB)];
               }).
               object().
               value();
    });
  };

  /*
   * Return a shallow copy of `example` from which all output-like
   * properties have been removed. For use on the test set in passing
   * an example to a learner for prediction.
   */
  this.stripOutput = function(example) {
    return _.omit(example, ['source', 'output', 'annotatedOutput']);
  };

  /*
   * Return a string summarizing the contents of a `stats` object
   * for human consumption, and dump the stats out to a results
   * file in the run directory.
   */
  this.report = function(stats) {
    var lines = [stats.experiment];
    var resultsDump = _.clone(stats);
    _.chain(stats).
      pairs().
      each(function(pair) {
        var key = pair[0];
        if (key == 'experiment') return;

        var values = pair[1];
        if (_.isArray(values)) {
          var mean = jStat.mean(values);
          resultsDump[key + '_mean'] = mean;
          var ci = jStat.tci(mean, 0.05, values);
          resultsDump[key + '_ci'] = ci;
          lines.push(key + ': ' + mean.toFixed(PRECISION) +
                     ' (' + ci[0].toFixed(PRECISION) +
                     '--' + ci[1].toFixed(PRECISION) + ')');
        } else {
          lines.push(key + ': ' + values);
        }
      });
    config.dumpPretty(resultsDump, 'results.json');
    return lines.join('\n');
  };
})();
