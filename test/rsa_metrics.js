var assert = require('chai').assert;
var metrics = require('../rsa/metrics.js');

describe("metrics", function() {
  describe("multisetDice", function() {
    it("should equal 1 for equal arrays", function() {
      var a = ['hair:yes', 'glasses:no'];
      var b = ['hair:yes', 'glasses:no'];
      assert.equal(metrics.multisetDice(a, b), 1);
    });

    it("should handle a pair as well as two arguments", function() {
      var a = ['hair:yes', 'glasses:no'];
      var b = ['hair:yes', 'glasses:no'];
      assert.equal(metrics.multisetDice([a, b]), 1);
    });
  });

  describe("instanceAccuracy", function() {
    it("should equal 1 for equal arrays", function() {
      var a = ['hair:yes', 'glasses:no'];
      var b = ['hair:yes', 'glasses:no'];
      assert.equal(metrics.instanceAccuracy(a, b), 1);
    });

    it("should handle a pair as well as two arguments", function() {
      var a = ['hair:yes', 'glasses:no'];
      var b = ['hair:yes', 'glasses:no'];
      assert.equal(metrics.instanceAccuracy([a, b]), 1);
    });
  });

  describe("meanMultisetDice", function() {
    it("should give 1 for perfect output", function() {
      var a = [['hair:yes', 'glasses:no'],
               ['hair:yes', 'glasses:yes']];
      var b = [['hair:yes', 'glasses:no'],
               ['hair:yes', 'glasses:yes']];
      assert.equal(metrics.meanMultisetDice(a, b), 1);
    });
  });

  describe("accuracy", function() {
    it("should average the accuracy of parallel (output, gold) arrays", function() {
      var a = [['hair:yes', 'glasses:no'],
               ['hair:yes', 'glasses:no']];
      var b = [['hair:yes', 'glasses:no'],
               ['hair:yes', 'glasses:yes']];
      assert.equal(metrics.accuracy(a, b), 0.5);
    });
  });
});
