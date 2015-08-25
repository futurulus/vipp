var _ = require('underscore');
var config = require('../rsa/config');
var experiment = require('../rsa/experiment');
var metrics = require('../rsa/metrics');
var instances = require('../rsa/tuna_instances');

var learners = {
  dummy: require('../rsa/learner').DummyLearner,
};

config.addOption('count', 'singular');
config.addOption('domain', 'furniture');
config.addOption('learnerType', 'dummy');
config.addOption('metricNames', 'accuracy,meanMultisetDice');
config.addOption('cv', 5);

var options = config.getOptions();

var learner = new (learners[options.learnerType])(options);
var data = instances.getInterpretation('rsa/data/tuna_' + options.count + '_' +
                                       options.domain + '.json');
var metricFuncs = _.map(options.metricNames.split(','), _.propertyOf(metrics));
return experiment.report(experiment.crossValidate(learner, data, metricFuncs, options.cv));
