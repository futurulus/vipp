var count = 'singular';
var domain = 'furniture';
var learnerType = 'dummy';
var learnerParams = {};
var metricNames = ['accuracy', 'meanMultisetDice'];
var cv = 5;


var _ = require('underscore');
var experiment = require('../rsa/experiment');
var metrics = require('../rsa/metrics');
var instances = require('../rsa/tuna_instances');

var learners = {
  dummy: require('../rsa/learner').DummyLearner,
};

var learner = new (learners[learnerType])(learnerParams);
var data = instances.getInterpretation('rsa/data/tuna_' + count + '_' + domain + '.json');
var metricFuncs = _.map(metricNames, _.propertyOf(metrics));
return experiment.report(experiment.crossValidate(learner, data, metricFuncs, cv));
