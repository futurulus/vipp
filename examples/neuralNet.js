var NUM_ATTRS = 4;
var A = 2;
var B = 3;

var target = function(theta) {
  return function() {
    var x = [];
    for(var i = 0; i < NUM_ATTRS; i++) {
      x.push(flip(0.5));
    }
    var y = flip(0.5);

    var feats = featurize(x, y);
    factor(mapDot(theta, feats));
    return [x, y];
  }
}

function featurize(x, y) {
  var feats = {};
  // console.log(JSON.stringify(x, null, 4));
  // console.log(JSON.stringify(y, null, 4));
  for (var i = 0; i < NUM_ATTRS; i++) {
    if (y)
      feats["bias"] = 1;
    else
      feats["bias"] = -1;

    if (x[i] == y)
      feats["" + i] = 1;
    else
      feats["" + i] = -1;

    for (var j = 0; j < NUM_ATTRS; j++) {
      if (i >= j) continue;

      if ((x[i] == x[j]) == y)
        feats["" + i + "+" + j] = 1;
      else
        feats["" + i + "+" + j] = -1;
    }
  }
  // console.log(JSON.stringify(feats, null, 4));
  return feats;
}

function mapDot(a, b) {
  var result = 0.0;
  for (var k in a) {
    if (a.hasOwnProperty(k) && b.hasOwnProperty(k)) {
      result = result + a[k] * b[k];
    }
  }
  return result;
}


var HIDDEN_LAYER_1 = NUM_ATTRS - 1;

var guide = function(params, args) {
  var x = [];
  for(var i = 0; i < NUM_ATTRS; i++) {
    x.push(flip(0.5));
  }

  var input = []
  for(var i = 0; i < NUM_ATTRS; i++) {
    input.push((x[i] - 0.5) * 2.0);
  }
  // console.log("input: " + JSON.stringify(input, null, 4));

  var weights1 = new Array(HIDDEN_LAYER_1);
  for(var i = 0; i < HIDDEN_LAYER_1; i++) {
    weights1[i] = new Array(NUM_ATTRS);
    for(var j = 0; j < NUM_ATTRS; j++) {
      weights1[i][j] = param(params, undefined, undefined, gaussianERP.sample, [0, 1 / Math.sqrt(NUM_ATTRS)]);
    }
  }
  // console.log("weights1: " + JSON.stringify(weights1, null, 4));

  var hidden1 = new Array(HIDDEN_LAYER_1);
  for(var i = 0; i < HIDDEN_LAYER_1; i++) {
    var z = 0;
    for(var j = 0; j < NUM_ATTRS; j++) {
      z = z + weights1[i][j] * input[j];
    }
    hidden1[i] = 1.7159 * Math.tanh(2/3 * z);
  }
  // console.log("hidden1: " + JSON.stringify(hidden1, null, 4));

  var weights2 = new Array(HIDDEN_LAYER_1);
  for(var i = 0; i < HIDDEN_LAYER_1; i++) {
    weights2[i] = param(params, undefined, undefined, gaussianERP.sample, [0, 1 / Math.sqrt(HIDDEN_LAYER_1)]);
  }
  // console.log("weights2: " + JSON.stringify(weights2, null, 4));

  var output = 0;
  for(var i = 0; i < HIDDEN_LAYER_1; i++) {
    output = output + weights2[i] * hidden1[i];
  }
  var prob = 1 / (1 + Math.exp(-output));
  // console.log("output: " + output);
  // console.log("prob: " + prob);

  var y = flip(prob);

  return [x, y];
}

/*var THETA_TRUE = {
  "0": 0.0, "1": 0.1, "2": 0.2, "3": 0.3,
  "0+1": 0.01, "0+2": 0.02, "0+3": 0.03,
  "1+2": 0.12, "1+3": 0.13, "2+3": 0.23,
  "0-1": -0.01, "0-2": -0.02, "0-3": -0.03,
  "1-2": -0.12, "1-3": -0.13, "2-3": -0.23,
};

var dataset = [];
for (var i = 0; i < 10000; i++) {
  dataset.push(run(guide, THETA_TRUE, undefined));
}*/


var theta = {
  "0": 0, "1": 0, "2": 0, "3": 0,
  "0+1": 0, "0+2": 0, "0+3": 0,
  "1+2": 0, "1+3": 0, "2+3": 0,
  "0-1": 0, "0-2": 0, "0-3": 0,
  "1-2": 0, "1-3": 0, "2-3": 0,
};

var result = infer(target(theta), guide, undefined, {
  verbosity: 2,
  nSamples: 100,
  nSteps: 5000,
  convergeEps: 0.001,
  initLearnRate: 0.5
});
//var paramsCopy = JSON.parse(JSON.stringify(result.params));
//console.log(JSON.stringify(paramsCopy, null, 4));


return result;
