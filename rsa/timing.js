/*
 * A module for periodically displaying progress on a hierarchy of tasks
 * and estimating time to completion.
 *
 * Usage:
 *
 * > var timing = require('./rsa/timing');
 * > timing.setResolution(0);  // show all messages, instead of only every minute
 * > timing.startTask('Repetition', 2);
 * > for(var rep = 0; rep < 2; rep++) {
 * ... timing.progress(rep);
 * ... timing.startTask('Example', 3);
 * ... for(var ex = 0; ex < 3; ex++) {
 * ..... timing.progress(ex);
 * ..... }
 * ... timing.endTask();
 * ... }
 * Repetition 0 of 2 (~0 done, ETA unknown)
 * Repetition 0 of 2, Example 0 of 3 (~0 done, ETA unknown)
 * Repetition 0 of 2, Example 1 of 3 (~17 done, ETA ...)
 * Repetition 0 of 2, Example 2 of 3 (~33 done, ETA ...)
 * Repetition 0 of 2, Example 3 of 3 (~50 done, ETA ...)
 * Repetition 1 of 2 (~50 done, ETA ...)
 * Repetition 1 of 2, Example 0 of 3 (~50 done, ETA ...)
 * Repetition 1 of 2, Example 1 of 3 (~67 done, ETA ...)
 * Repetition 1 of 2, Example 2 of 3 (~83 done, ETA ...)
 * Repetition 1 of 2, Example 3 of 3 (~100 done, ETA ...)
 * > timing.endTask();
 * Repetition 2 of 2 (~100 done, ETA ...)
 */

var _ = require('underscore');

module.exports = new (function() {
  var timing = this;

  this.ProgressMonitor = function(resolution_ms) {
    this.taskStack = [];
    this.lastReport = new Date(0);
    this.resolution_ms = resolution_ms;
    this.startTime = new Date();
  };
  this.ProgressMonitor.prototype = {
    startTask: function(name, size) {
      if (this.taskStack.length == 0) {
        this.startTime = new Date();
      }
      this.taskStack.push({name: name, size: size, progress: 0});
    },

    progress: function(p) {
      this.taskStack[this.taskStack.length - 1].progress = p;
      this.progressReport();
    },

    endTask: function() {
      this.progress(this.taskStack[this.taskStack.length - 1].size);
      this.taskStack.pop();
    },

    progressReport: function() {
      var now = new Date();
      if (now - this.lastReport < this.resolution_ms) return;

      var printout = this.taskStack.map(function(task) {
        return task.name + ' ' + task.progress + ' of ' + task.size;
      }).join(', ');

      var fracDone = this.fractionDone();
      var etaStr;
      if (fracDone === 0) {
        etaStr = 'unknown';
      } else {
        var elapsed = now - this.startTime;
        var estimatedLength = elapsed / fracDone;
        var eta = new Date(+this.startTime + estimatedLength);
        etaStr = eta.toLocaleString();
      }

      console.log(printout + ' (~' + Math.round(fracDone * 100) +
                  '% done, ETA ' + etaStr + ')');
      this.lastReport = new Date();
    },

    fractionDone: function(start, finish, stack) {
      start = (start === undefined) ? 0.0 : start;
      finish = (finish === undefined) ? 1.0 : finish;
      stack = (stack === undefined) ? this.taskStack : stack;

      if (stack.length === 0) {
        return start;
      } else {
        var topFraction = stack[0].progress / stack[0].size;
        var nextTopFraction = (stack[0].progress + 1) / stack[0].size;
        var innerStart = start + topFraction * (finish - start);
        var innerFinish = start + nextTopFraction * (finish - start);
        return this.fractionDone(innerStart, innerFinish, _.rest(stack));
      }
    },
  };

  this.globalMonitor = new timing.ProgressMonitor(60 * 1000);

  this.startTask = this.globalMonitor.startTask.bind(this.globalMonitor);
  this.progress = this.globalMonitor.progress.bind(this.globalMonitor);
  this.endTask = this.globalMonitor.endTask.bind(this.globalMonitor);
  this.setResolution = function(resolution_ms) { 
    this.globalMonitor.resolution_ms = resolution_ms;
  }
})();
