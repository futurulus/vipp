var _ = require('underscore');
var fs = require('fs');

module.exports = new (function() {
  var tuna_instances = this;

  this.attrString = function(attribute) {
    return attribute.name + ':' + attribute.value;
  };

  this.getInterpretation = function(filename) {
    var trials = JSON.parse(fs.readFileSync(filename));

    return _.map(trials, function(trial) {
      var output = _.where(trial.domain.entity, {type: 'target'})[0].
                     attribute.map(tuna_instances.attrString);
      var altOutputs = _.chain(trial.domain.entity).
                         pluck('attribute').
                         map(function(attribute) {
                           return attribute.map(tuna_instances.attrString);
                         }).
                         shuffle().
                         value();
      return {
        input: trial.stringDescription,
        annotatedInput: trial.description,
        output: output,
        altOutputs: altOutputs,
        source: trial,
      };
    });
  }
})();
