var assert = require('chai').assert;
var e = require('../rsa/experiment.js');

describe("experiment", function() {
  describe("combineStats", function() {
    it("should return an object with concatenated parallel arrays", function() {
      var actual = e.combineStats([{f1: [0.5]}, {f1: [0.5]}, {f1: [1]}]);
      var expected = {f1: [0.5, 0.5, 1]};
      assert.deepEqual(actual, expected);
    });

    it("should handle a non-array `experiment` property", function() {
      assert.doesNotThrow(function() {
        e.combineStats([{experiment: 'a', f1: [0.5]}, {experiment: 'b', f1: [0]}]);
      });
    });
  });

  describe("stripOutput", function() {
    it("should remove source, output, and annotatedOutput", function() {
      var actual = e.stripOutput({input: 'bad movie', output: 'negative',
                                  annotatedInput: ['bad_JJ', 'movie_NN'],
                                  annotatedOutput: -2, source: '20a3fe'})
      var expected = {input: 'bad movie', annotatedInput: ['bad_JJ', 'movie_NN']};
      assert.deepEqual(actual, expected);
    });

    it("should not throw if output is missing", function() {
      var actual = e.stripOutput({input: 'bad movie',
                                  annotatedInput: ['bad_JJ', 'movie_NN'],
                                  source: '20a3fe'})
      var expected = {input: 'bad movie', annotatedInput: ['bad_JJ', 'movie_NN']};
      assert.deepEqual(actual, expected);
    });
  });

  describe("report", function() {
    it("should include experiment at the beginning", function() {
      var actual = e.report({experiment: 'LOOCV'});
      var expected = 'LOOCV';
      assert.equal(actual, expected);
    });

    it("should report mean and 95% CI for each stat", function() {
      var actual = e.report({experiment: 'LOOCV',
                             f1: [0.9, 0.8, 0.9, 0.7, 0.7],
                             acc: [0.95, 0.85, 0.9, 0.8, 0.75]});
      var expected = ['LOOCV\nacc: 0.850 (0.752--0.948)\nf1: 0.800 (0.676--0.924)',
                      'LOOCV\nf1: 0.800 (0.676--0.924)\nacc: 0.850 (0.752--0.948)'];
      assert.include(expected, actual);
    });
  });
});

