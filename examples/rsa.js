var config = require('../rsa/config');
config.redirectOutput();

var _ = require('underscore');
var numeric = require('numeric');

config.addOption('l2Coeff', 0.01);
config.addOption('learnRate', 0.01);
config.addOption('hiddenLayer', 6);

var options = config.getOptions();

var NUM_ATTRS = 2;
var HIDDEN_LAYER_1 = options.hiddenLayer;
var NUM_WORDS = 1;  // TODO: can't do more than 1 here in the VI implementation
var A = 2;
var B = 3;

var trueTarget = function(theta) {
  return function() {
    var x = randomBooleanVec(NUM_ATTRS);
    var y = randomBooleanVec(NUM_WORDS);

    var xs = allBooleanVecs(NUM_ATTRS);
    var ys = allBooleanVecs(NUM_WORDS);
    factor(Math.log(trueRSAProb(theta, xs, ys, x, y)));

    return [x, y];
  };
};

var getLiteralLogProbs = function(theta, xs, ys) {
  var literalScores = _.map(xs, function(x) {
    return _.map(ys, function(y) {
      return mapDot(theta, featurize(x, y));
    });
  });
  return _.map(literalScores, logNormalize);
};

var trueLiteralDist = function(theta, xs, ys) {
  return _.map(getLiteralLogProbs(theta, xs, ys), numeric.exp);
};

var trueS1Dist = function(theta, xs, ys) {
  var literalLogProbs = getLiteralLogProbs(theta, xs, ys);
  var speakerLogProbs = _.map(numeric.transpose(literalLogProbs), logNormalize);
  return _.map(speakerLogProbs, numeric.exp);
};

var trueRSADist = function(theta, xs, ys) {
  var literalLogProbs = getLiteralLogProbs(theta, xs, ys);
  var speakerLogProbs = _.map(numeric.transpose(literalLogProbs), logNormalize);
  var listenerLogProbs = _.map(numeric.transpose(speakerLogProbs), logNormalize);
  return _.map(listenerLogProbs, numeric.exp);
};

var trueGradient = function(theta, xs, ys, x, y) {
  var xIndex = deepIndexOf(xs, x);
  var yIndex = deepIndexOf(ys, y);

  var featureTensor = _.map(xs, function(x) {
    return _.map(ys, function(y) {
      return featurize(x, y);
    });
  });
  var y0 = softmaxLayer(featureTensor, theta);
  var x1 = rsaLayer(y0);
  var y1 = rsaLayer(x1);
  var grad = y1.grad[xIndex][yIndex];
  var estimate = estimateGrad(theta, xs, ys, xIndex, yIndex);
  var discrepancy = mapNorm(mapSub(grad, estimate));
  console.log('grad discrepancy:' + discrepancy);
  if (discrepancy > 1e-4) {
    console.log('full:');
    console.log(grad);
    console.log('numerical:');
    console.log(estimate);
    throw 'Failed gradient check (discrepancy = ' + discrepancy + ')';
  }
  return grad;
};

var estimateGrad = function(theta, xs, ys, xIndex, yIndex) {
  var epsilon = 1e-4;
  return _.mapObject(theta, function(val, key) {
    var minus = _.clone(theta);
    minus[key] -= epsilon;
    var minusLogProb = Math.log(trueRSADist(minus, xs, ys)[xIndex][yIndex]);
    var plus = _.clone(theta);
    plus[key] += epsilon;
    var plusLogProb = Math.log(trueRSADist(plus, xs, ys)[xIndex][yIndex]);

    return (plusLogProb - minusLogProb) / (2 * epsilon);
  });
};

var softmaxLayer = function(featureTensor, theta) {
  // log Y_0[x,y] = sum_f phi[x,y,f] * theta[f]
  //                - log sum_y' exp(sum_f phi[x,y',f] * theta[f])
  var scores = _.map(featureTensor, function(xRow) {
    return logNormalize(_.map(xRow, function(feats) {
      return mapDot(theta, feats);
    }));
  });

  // E_Y_0(phi)[x,f] = sum_y phi[x,y,f] * Y_0[x,y]
  var probs = numeric.exp(scores);
  var expectedFeats = _.map(featureTensor, function(xRow, i) {
    return _.reduce(_.map(xRow, function(feats, j) {
      return mapScalarMult(probs[i][j], feats);
    }), mapAdd);
  });

  // grad(Y_0)[x,y,f] = phi[x,y,f] - E_Y_0(phi)[x,f]
  var grad = _.map(featureTensor, function(xRow, i) {
    return _.map(xRow, function(feats) {
      return mapAdd(feats, mapScalarMult(-1, expectedFeats[i]));
    });
  });

  return {
    scores: scores,
    grad: grad,
  };
};

var rsaLayer = function(lower) {
  // log X_1[y,x] = log Y_0[x,y] - log sum_x' exp(log Y_0[x,y'])
  var scores = _.map(numeric.transpose(lower.scores), logNormalize);

  // E_X_1(phi)[y,f] = sum_x grad(Y_0)[x,y,f] * X_1[y,x]
  var probs = numeric.exp(scores);
  var gradsT = numeric.transpose(lower.grad);
  var expectedLowerGrad = _.map(gradsT, function(yRow, i) {
    return _.reduce(_.map(yRow, function(lowerGrad, j) {
      return mapScalarMult(probs[i][j], lowerGrad);
    }), mapAdd);
  });

  // grad(X_1)[y,x,f] = grad(Y_0)[x,y,f] - E_X_1(phi)[y,f]
  var grad = _.map(gradsT, function(yRow, i) {
    return _.map(yRow, function(lowerGrad) {
      return mapAdd(lowerGrad, mapScalarMult(-1, expectedLowerGrad[i]));
    });
  });

  return {
    scores: scores,
    grad: grad,
  };
};

var trueRSAProb = function(theta, xs, ys, x, y) {
  var xIndex = deepIndexOf(xs, x);
  var yIndex = deepIndexOf(ys, y);

  var probs = trueRSADist(theta, xs, ys);
  return probs[xIndex][yIndex];
};

var countsDist = function(dataset, xs, ys) {
  var counts = _.map(xs, function(x) {
    return _.map(ys, function(y) { return 0; });
  });

  _.each(dataset, function(pair) {
    var x = pair[0];
    var xi = deepIndexOf(xs, x);
    var y = pair[1];
    var yi = deepIndexOf(ys, y);

    counts[xi][yi] += 1;
  });

  return _.map(counts, function(row) {
    return numeric.div(row, numeric.sum(row));
  });
};

var deepIndexOf = function(arr, elem) {
  return _.findIndex(arr, function(e) { return _.isEqual(e, elem); });
};

var logNormalize = function(vec) {
  var max = Math.max.apply(null, vec);
  vec = numeric.sub(vec, max);
  return numeric.sub(vec, Math.log(numeric.sum(numeric.exp(vec))));
};

var randomBooleanVec = function(n) {
  var result = [];
  for(var i = 0; i < n; i++) {
    result.push(flip(0.5));
  }
  return result;
};

var allBooleanVecs = function(n) {
  if (n <= 0) return [[]];

  var result = [];
  var smaller = allBooleanVecs(n - 1);
  for(var i = 0; i < smaller.length; i++) {
    for(var x = 0; x <= 1; x++) {
      var newVec = _.clone(smaller[i]);
      newVec.push(x == 1);
      result.push(newVec);
    }
  }
  return result;
};

var fullVIDist = function(phi, xs, ys, inDim, hiddenDim, outDim) {
  var probs = [];
  for (var i = 0; i < xs.length; i++) {
    var probsX = [];
    for (var j = 0; j < ys.length; j++) {
      var prob = variationalProb(phi, inDim, hiddenDim, outDim, xs[i], ys[j]);
      probsX.push(prob);
    }
    probs.push(probsX);
  }
  return probs;

};

var logLikelihood = function(dataset, dist, xs, ys) {
  var result = 0.0;
  _.each(dataset, function(pair) {
    var x = pair[0];
    var xi = deepIndexOf(xs, x);
    var y = pair[1];
    var yi = deepIndexOf(ys, y);

    result += Math.log(dist[xi][yi]);
  });
  return result;
};

var target = function(theta) {
  return function() {
    var x = randomBooleanVec(NUM_ATTRS);
    var y = randomBooleanVec(NUM_WORDS);

    var feats = featurize(x, y);
    var score = mapDot(theta, feats);
    factor(score);
    return [x, y];
  };
};

var approxS = function(phi) {
  return function() {
    var x = randomBooleanVec(NUM_ATTRS);
    var y = randomBooleanVec(NUM_WORDS);

    var z = score(guideCond(NUM_ATTRS, HIDDEN_LAYER_1, NUM_WORDS), phi, x);
    factor(z);
    return [x, y];
  };
};

var approxL = function(chi) {
  return function() {
    var x = randomBooleanVec(NUM_ATTRS);
    var y = randomBooleanVec(NUM_WORDS);

    factor(score(guideCond(NUM_WORDS, HIDDEN_LAYER_1, NUM_ATTRS), chi, y));
    return [x, y];
  };
};

function featurize(x, y, verbose) {
  var feats = {};
  //if (verbose) {
  //  console.log([x, y]);
  //}
  for (var i = 0; i < NUM_ATTRS; i++) {
    if (y[0])
      feats["bias"] = 1;
    else
      feats["bias"] = -1;

    if (x[i] == y[0])
      feats["" + i] = 1;
    else
      feats["" + i] = -1;

    for (var j = 0; j < NUM_ATTRS; j++) {
      if (i >= j) continue;

      if ((x[i] == x[j]) == y[0])
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

function mapSub(a, b) {
  var result = {};
  for (var k in a) {
    if (a.hasOwnProperty(k) && b.hasOwnProperty(k)) {
      result[k] = a[k] - b[k];
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

var guideCond = function(inputSize, hiddenSize, outputSize, initialParams) {
  return function(params, args) {
    var x = args;

    var probs = variationalElemProbs(params, param, inputSize, hiddenSize, outputSize, initialParams, x);
    // console.log("probs: " + probs);
    var y = [];
    for (var i = 0; i < probs.length; i++) {
      y.push(flip(probs[i]));
    }
    return [x, y];
  };
};

var rawParamFunc = function(params, initialValue) {
  return initialValue;
};

var variationalProb = function(params, inputSize, hiddenSize, outputSize, x, y) {
  var elemProbs = variationalElemProbs(null, rawParamFunc, inputSize, hiddenSize, outputSize, params.values, x);

  var totalProb = 1.0;
  for (var i = 0; i < y.length; i++) {
    totalProb *= y[i] ? elemProbs[i] : (1 - elemProbs[i]);
  }
  return totalProb;
};

var variationalElemProbs = function(params, paramFunc, inputSize, hiddenSize, outputSize, initialParams, x) {
  var paramIndex = 0;
  var input = [];
  for(var i = 0; i < inputSize; i++) {
    input.push((x[i] - 0.5) * 2.0);
  }
  //if(paramFunc == rawParamFunc) console.log("input: " + JSON.stringify(input, null, 4));

  var weights1 = new Array(hiddenSize);
  for(var i = 0; i < hiddenSize; i++) {
    weights1[i] = new Array(inputSize);
    for(var j = 0; j < inputSize; j++) {
      if(initialParams) {
        weights1[i][j] = paramFunc(params, initialParams[paramIndex]);
      } else {
        weights1[i][j] = paramFunc(params, undefined, undefined, gaussianERP.sample, [0, 1 / Math.sqrt(inputSize)]);
      }
      paramIndex++;
    }
  }
  //if(paramFunc == rawParamFunc) console.log(weights1);
  //if(paramFunc == rawParamFunc) console.log(initialParams);

  var hidden1 = new Array(hiddenSize);
  for(var i = 0; i < hiddenSize; i++) {
    var z = 0;
    for(var j = 0; j < inputSize; j++) {
      z = z + weights1[i][j] * input[j];
    }
    hidden1[i] = 1.7159 * Math.tanh(2/3 * z);
  }
  //if(paramFunc == rawParamFunc) console.log(hidden1);

  var weights2 = new Array(hiddenSize);
  for(var i = 0; i < hiddenSize; i++) {
    weights2[i] = new Array(outputSize);
    for(var j = 0; j < outputSize; j++) {
      if(initialParams) {
        weights2[i][j] = paramFunc(params, initialParams[paramIndex]);
      } else {
        weights2[i][j] = paramFunc(params, undefined, undefined, gaussianERP.sample, [0, 1 / Math.sqrt(hiddenSize)]);
      }
      paramIndex++;
    }
  }
  //if(paramFunc == rawParamFunc) console.log(weights2);

  var output = new Array(outputSize);
  var probs = [];
  for(var i = 0; i < outputSize; i++) {
    output[i] = 0;
    for(var j = 0; j < hiddenSize; j++) {
      output[i] = output[i] + weights2[j][i] * hidden1[j];
    }
    var prob = 1 / (1 + Math.exp(-output[i]));
    probs.push(prob);
  }
  //if(paramFunc == rawParamFunc) console.log(output);
  return probs;
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
  bias: 0.0,
  "0": 0.0, "1": 0.1, "2": 0.2, "3": 0.3,
  "0+1": 0.01, "0+2": 0.02, "0+3": 0.03,
  "1+2": 0.12, "1+3": 0.13, "2+3": 0.23,
  "0-1": -0.01, "0-2": -0.02, "0-3": -0.03,
  "1-2": -0.12, "1-3": -0.13, "2-3": -0.23,
};

var dataset = [];
for (var i = 0; i < 1000; i++) {
  var example = target(THETA_TRUE)();
  dataset.push(example);
}

var theta = {
  bias: -1,
  "0": 0.5, "1": 0.5, "0+1": -0.5,
};

/*
var theta = {
  bias: 0,
  "0": 0, "1": 0, "2": 0, "3": 0,
  "0+1": 0, "0+2": 0, "0+3": 0,
  "1+2": 0, "1+3": 0, "2+3": 0,
  "0-1": 0, "0-2": 0, "0-3": 0,
  "1-2": 0, "1-3": 0, "2-3": 0,
};
*/


var phi = {};
var chi = {};
var psi = {};

var vippOptions = {
  verbosity: 1,
  nSamples: 100,
  nSteps: 500,
  convergeEps: 0.001,
  initLearnRate: 0.5
};

var numGradientSamples = 100;
var batchSize = 20;
var l2Coeff = options.l2Coeff;
var learnRate = options.learnRate;
var absTol = 0.00001;

numeric.precision = 4;

var ALL_X = allBooleanVecs(NUM_ATTRS);
var ALL_Y = allBooleanVecs(NUM_WORDS);


//while(true) {
  var absChange = 0;
  for(var k = 0; k < dataset.length; /* next batch */) {
    var batch = [];
    for (var b = 0; b < batchSize && k + b < dataset.length; b = b + 1) {
      batch.push(dataset[k + b]);
    }
    k = k + b;

    var l0Results = infer(target(theta),
                          guide(NUM_ATTRS, HIDDEN_LAYER_1, NUM_WORDS, /*phi.values*/undefined),
                          undefined, vippOptions);
    phi = l0Results.params;
    var s1Results = infer(approxS(phi),
                          guide(NUM_WORDS, HIDDEN_LAYER_1, NUM_ATTRS, /*chi.values*/undefined),
                          undefined, vippOptions);
    chi = s1Results.params;
    var l2Results = infer(approxL(chi),
                          guide(NUM_ATTRS, HIDDEN_LAYER_1, NUM_WORDS, /*psi.values*/undefined),
                          undefined, vippOptions);
    psi = l2Results.params;

    var grad;
    for (var b = 0; b < batchSize; b = b + 1) {
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
                                          featurize(batch[b][0], samplesL0[j][1])));
      }
      for(var j = 0; j < samplesS1.length; j = j + 1) {
        grad = mapAdd(grad, mapScalarMult(-1 / samplesS1.length,
                                          featurize(samplesS1[j][1], batch[b][1])));

        for(var i = 0; i < samplesL2[j].length; i++) {
          grad = mapAdd(grad, mapScalarMult(1 / (samplesL2[j].length * samplesL0.length),
                                            featurize(samplesS1[j][1], samplesL2[j][i][1])));
        }
      }
    }
    var update = mapAdd(mapScalarMult(learnRate / batchSize, grad),
                        mapScalarMult(-l2Coeff, theta));

    var trueDist = trueRSADist(THETA_TRUE, ALL_X, ALL_Y);
    console.log('true dist (used to generate dataset):');
    console.log(numeric.prettyPrint(trueDist));

    var empDist = countsDist(dataset, ALL_X, ALL_Y);
    console.log('dataset empirical dist:');
    console.log(numeric.prettyPrint(empDist));

    var litDist = trueLiteralDist(theta, ALL_X, ALL_Y);
    console.log('L0 dist (from theta):');
    console.log(numeric.prettyPrint(litDist));

    var viL0Dist = fullVIDist(phi, ALL_X, ALL_Y, NUM_ATTRS, HIDDEN_LAYER_1, NUM_WORDS);
    console.log('approximate L0 dist (from phi):');
    console.log(numeric.prettyPrint(viL0Dist));

    var s1Dist = trueS1Dist(theta, ALL_X, ALL_Y);
    console.log('S1 dist (from theta):');
    console.log(numeric.prettyPrint(s1Dist));

    var viS1Dist = fullVIDist(chi, ALL_Y, ALL_X, NUM_WORDS, HIDDEN_LAYER_1, NUM_ATTRS);
    console.log('approximate S1 dist (from chi):');
    console.log(numeric.prettyPrint(viS1Dist));

    var thetaDist = trueRSADist(theta, ALL_X, ALL_Y);
    console.log('full learned RSA dist (from theta):');
    console.log(numeric.prettyPrint(thetaDist));

    var viDist = fullVIDist(psi, ALL_X, ALL_Y, NUM_ATTRS, HIDDEN_LAYER_1, NUM_WORDS);
    console.log('approximate VI dist (from psi):');
    console.log(numeric.prettyPrint(viDist));

    console.log('VI-estimated subgradient:');
    console.log(grad);

    var actualGrad = _.reduce(_.map(batch, function(pair) {
      var x = pair[0], y = pair[1];
      return trueGradient(theta, ALL_X, ALL_Y, x, y);
    }), mapAdd);
    console.log('true subgradient:');
    console.log(actualGrad);

    theta = mapAdd(theta, update);
    console.log('new theta:');
    console.log(theta);
    absChange = mapNorm(update);
    console.log('abs change in theta:' + absChange);

    var llTrue = logLikelihood(dataset, trueDist, ALL_X, ALL_Y);
    console.log('llTrue:' + llTrue);
    var llTheta = logLikelihood(dataset, thetaDist, ALL_X, ALL_Y);
    console.log('llTheta:' + llTheta);
    var objTheta = llTheta - 0.5 * l2Coeff * mapNorm(theta);
    console.log('objTheta:' + objTheta);
    var llVI = logLikelihood(dataset, viDist, ALL_X, ALL_Y);
    console.log('llVI:' + llVI);

    /*if (absChange < absTol)*/ break;
  }
//  if (absChange < absTol) break;
//}
//var paramsCopy = JSON.parse(JSON.stringify(result.params));
//console.log(JSON.stringify(paramsCopy, null, 4));


return '';
