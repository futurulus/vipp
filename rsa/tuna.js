var _ = require('underscore');

var config = require('../rsa/config');
config.redirectOutput();

var experiment = require('../rsa/experiment');
var metrics = require('../rsa/metrics');
var instances = require('../rsa/tuna_instances');

var learners = {
  dummy: require('../rsa/learner').DummyLearner,
};

config.addOption('verbose', 0);
config.addOption('data_dir', 'singular/furniture');
config.addOption('learner_type', 'dummy');
config.addOption('metrics', 'accuracy,meanMultisetDice');
config.addOption('cv', 5, null, ['folds', 'splits']);
config.addOption('generation', false, 'boolean');
config.addOption('random_splits', false, 'boolean');
config.addOption('train_percentage', 0.8);  // used only if random_splits is true

var options = config.getOptions();

var learner = new (learners[options.learner_type])(options);
var getInstances = (options.generation ? instances.getInterpretation :
                                         instances.getGeneration);
var data = getInstances('rsa/data/tuna_' + options.data_dir.replace(/\//g, '_') + '.json');
var metricFuncs = _.map(options.metrics.split(','), _.propertyOf(metrics));
var results;
if (options.random_splits) {
  results = experiment.report(experiment.randomSplits(learner, data, metricFuncs,
                                                   options.cv, options.train_percentage));
} else {
  results = experiment.report(experiment.crossValidate(learner, data, metricFuncs, options.cv));
}
console.log(results);
