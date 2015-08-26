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
      var shuffled = _.shuffle(trial.domain.entity);
      var output = _.chain(_.range(shuffled.length)).
                     filter(function (k) { return shuffled[k].type === 'target'; }).
                     value();
      var domain = _.chain(shuffled).
                     pluck('attribute').
                     map(function(attribute) {
                       return attribute.map(tuna_instances.attrString);
                     }).
                     value();
      return {
        input: trial.stringDescription,
        annotatedInput: trial.description,
        output: output,
        context: {number: output.length, domain: domain},
        source: trial,
      };
    });
  }
})();
