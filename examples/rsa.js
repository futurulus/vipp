var NUM_ATTRS = 4;
var A = 2;
var B = 3;

var trueTarget = function(theta) {
  return function() {

  };
};

var target = function(theta) {
  return function() {
    var x = [];
    for(var i = 0; i < NUM_ATTRS; i++) {
      x.push(flip(0.5));
    }
    var y = flip(0.5);

    var feats = featurize(x, y);
    var score = mapDot(theta, feats);
    factor(score);
    return [x, [y]];
  };
};

var approxS = function(phi) {
  return function() {
    var x = [];
    for(var i = 0; i < NUM_ATTRS; i++) {
      x.push(flip(0.5));
    }
    var y = flip(0.5);

    var z = score(guideCond(NUM_ATTRS, HIDDEN_LAYER_1, 1), phi, x);
    factor(z);
    return [x, [y]];
  };
};

var approxL = function(chi) {
  return function() {
    var x = [];
    for(var i = 0; i < NUM_ATTRS; i++) {
      x.push(flip(0.5));
    }
    var y = flip(0.5);

    factor(score(guideCond(1, HIDDEN_LAYER_1, NUM_ATTRS), chi, [y]));
    return [x, [y]];
  };
};

function featurize(x, y, verbose) {
  var feats = {};
  //if (verbose) {
  //  console.log([x, y]);
  //}
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
  if (verbose) {
    console.log(JSON.stringify(feats, null, -1));
  }
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

function mapAdd(a, b) {
  var result = {};
  for (var k in a) {
    if (a.hasOwnProperty(k) && b.hasOwnProperty(k)) {
      result[k] = a[k] + b[k];
    }
  }
  return result;
}

function mapScalarMult(a, b) {
  var result = {};

  if (typeof b == 'number') {
    var temp = a; a = b; b = temp;
  }

  for (var k in b) {
    if (b.hasOwnProperty(k)) {
      result[k] = a * b[k];
    }
  }

  return result;
}

function mapNorm(a) {
  var result = 0;
  for (var k in a) {
    if (a.hasOwnProperty(k)) {
      result += a[k] * a[k];
    }
  }
  return result;
}

var HIDDEN_LAYER_1 = NUM_ATTRS - 1;

var guideCond = function(inputSize, hiddenSize, outputSize, initialParams) {
  return function(params, args) {
    var paramIndex = 0;
    var x = args;

    var input = [];
    for(var i = 0; i < inputSize; i++) {
      input.push((x[i] - 0.5) * 2.0);
    }
    // console.log("input: " + JSON.stringify(input, null, 4));

    var weights1 = new Array(hiddenSize);
    for(var i = 0; i < hiddenSize; i++) {
      weights1[i] = new Array(inputSize);
      for(var j = 0; j < inputSize; j++) {
        if(initialParams) {
          weights1[i][j] = param(params, initialParams[paramIndex]);
        } else {
          weights1[i][j] = param(params, undefined, undefined, gaussianERP.sample, [0, 1 / Math.sqrt(inputSize)]);
        }
        paramIndex++;
      }
    }
    // console.log("weights1: " + JSON.stringify(weights1, null, 4));

    var hidden1 = new Array(hiddenSize);
    for(var i = 0; i < hiddenSize; i++) {
      var z = 0;
      for(var j = 0; j < inputSize; j++) {
        z = z + weights1[i][j] * input[j];
      }
      hidden1[i] = 1.7159 * Math.tanh(2/3 * z);
    }
    //console.log(hidden1);

    var weights2 = new Array(hiddenSize);
    for(var i = 0; i < hiddenSize; i++) {
      weights2[i] = new Array(outputSize);
      for(var j = 0; j < outputSize; j++) {
        if(initialParams) {
          weights2[i][j] = param(params, initialParams[paramIndex]);
        } else {
          weights2[i][j] = param(params, undefined, undefined, gaussianERP.sample, [0, 1 / Math.sqrt(hiddenSize)]);
        }
        paramIndex++;
      }
    }
    // console.log(weights2);

    var output = new Array(outputSize);
    var y = [];
    for(var i = 0; i < outputSize; i++) {
      output[i] = 0;
      for(var j = 0; j < hiddenSize; j++) {
        output[i] = output[i] + weights2[j][i] * hidden1[j];
      }
      var prob = 1 / (1 + Math.exp(-output[i]));
      y.push(flip(prob));
    }
    // console.log(output);
    // console.log("prob: " + prob);

    return [x, [y]];
  };
};

var guide = function(inputSize, hiddenSize, outputSize, initialParams) {
  return function(params, args) {
    var x = [];
    for(var i = 0; i < inputSize; i++) {
      x.push(flip(0.5));
    }

    return guideCond(inputSize, hiddenSize, outputSize, initialParams)(params, x);
  };
};

var THETA_TRUE = {
  "0": 0.0, "1": 0.1, "2": 0.2, "3": 0.3,
  "0+1": 0.01, "0+2": 0.02, "0+3": 0.03,
  "1+2": 0.12, "1+3": 0.13, "2+3": 0.23,
  "0-1": -0.01, "0-2": -0.02, "0-3": -0.03,
  "1-2": -0.12, "1-3": -0.13, "2-3": -0.23,
};

var dataset = [];
for (var i = 0; i < 10000; i++) {
  var example = target(THETA_TRUE)();
  dataset.push(example);
}


var theta = {
  "0": 0, "1": 0, "2": 0, "3": 0,
  "0+1": 0, "0+2": 0, "0+3": 0,
  "1+2": 0, "1+3": 0, "2+3": 0,
  "0-1": 0, "0-2": 0, "0-3": 0,
  "1-2": 0, "1-3": 0, "2-3": 0,
};


var phi = {};
var chi = {};
var psi = {};

var vippOptions = {
  verbosity: 1,
  nSamples: 100,
  nSteps: 5000,
  convergeEps: 0.001,
  initLearnRate: 0.5
};

var numGradientSamples = 100;
var batchSize = 20;
var l2Coeff = 0.01;
var learnRate = 0.01;
var absTol = 0.00001;

while(true) {
  var absChange = 0;
  for(var k = 0; k < dataset.length; /* next batch */) {
    var batch = [];
    for (var b = 0; b < batchSize && k + b < dataset.length; b++, k++) {
      batch.push(dataset[k + b]);
    }

    var l0Results = infer(target(theta),
                          guide(NUM_ATTRS, HIDDEN_LAYER_1, 1, /*phi.values*/undefined),
                          undefined, vippOptions);
    phi = l0Results.params;
    var s1Results = infer(approxS(phi),
                          guide(1, HIDDEN_LAYER_1, NUM_ATTRS, /*chi.values*/undefined),
                          undefined, vippOptions);
    chi = s1Results.params;
    var l2Results = infer(approxL(chi),
                          guide(NUM_ATTRS, HIDDEN_LAYER_1, 1, /*psi.values*/undefined),
                          undefined, vippOptions);
    psi = l2Results.params;

    var grad;
    for (var b = 0; b < batchSize; b++) {
      var samplesL0 = [];
      var samplesS1 = [];
      var samplesL2 = [];
      for (var i = 0; i < numGradientSamples; i++) {
        var sampleL0 = run(guideCond(NUM_ATTRS, HIDDEN_LAYER_1, 1), phi, batch[b][0]);
        samplesL0.push(sampleL0);
        var sampleS1 = run(guideCond(1, HIDDEN_LAYER_1, NUM_ATTRS), chi, batch[b][1]);
        samplesS1.push(sampleS1);
        var subsamples = [];
        for (var j = 0; j < numGradientSamples; j++) {
          subsamples.push(run(guideCond(NUM_ATTRS, HIDDEN_LAYER_1, 1), psi, sampleS1));
        }
        samplesL2.push(subsamples);
      }

      var newGrad = featurize(batch[b][0], batch[b][1][0]);
      if (grad) {
        grad = mapAdd(grad, newGrad);
      } else {
        grad = newGrad;
      }
      for(var j = 0; j < samplesL0.length; j++) {
        grad = mapAdd(grad, mapScalarMult(-1 / samplesL0.length,
                                          featurize(batch[b][0], samplesL0[j][1][0])));
      }
      for(var j = 0; j < samplesS1.length; j++) {
        var absChange = 0;
        grad = mapAdd(grad, mapScalarMult(-1 / samplesS1.length,
                                          featurize(samplesS1[j][1], batch[b][1][0])));

        for(var i = 0; i < samplesL2[j].length; i++) {
          grad = mapAdd(grad, mapScalarMult(1 / (samplesL2[j].length * samplesL0.length),
                                            featurize(samplesS1[j][1], samplesL2[j][i][1][0])));
        }
      }
    }
    var update = mapAdd(mapScalarMult(learnRate / batchSize, grad),
                        mapScalarMult(-l2Coeff, theta));
    theta = mapAdd(theta, update);
    console.log(theta);
    absChange = mapNorm(update);
    console.log(absChange);
    if (absChange < absTol) break;
  }
  if (absChange < absTol) break;
}
//var paramsCopy = JSON.parse(JSON.stringify(result.params));
//console.log(JSON.stringify(paramsCopy, null, 4));


return '';
