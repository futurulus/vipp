module.exports = new (function() {
  var learner = this;

  /*
   * A silly baseline learner that cannot be trained and
   * simply predicts the first possibility.
   */
  this.DummyLearner = function() {};
  this.DummyLearner.prototype = {
    train: function(data) {
      return {};
    },

    predict: function(example) {
      return example.altOutputs[0];
    },
  };
})();
