var _ = require('underscore');
var numeric = require('numeric');

var NUM_ATTRS = 2;
var NUM_WORDS = 1;

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

var theta_template = featurize([1, 1, 1], [1]);

function getRandomTheta() {
  var result = {};
  for (var k in theta_template) {
    if (theta_template.hasOwnProperty(k)) {
      result[k] = gaussian(0, 1);
    }
  }
  return result;
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

var getLiteralLogProbs = function(theta, xs, ys) {
  var literalScores = _.map(xs, function(x) {
    return _.map(ys, function(y) {
      return mapDot(theta, featurize(x, y));
    });
  });
  return _.map(literalScores, logNormalize);
};

var trueRSADist = function(theta, xs, ys) {
  var literalLogProbs = getLiteralLogProbs(theta, xs, ys);
  var speakerLogProbs = _.map(numeric.transpose(literalLogProbs), logNormalize);
  var listenerLogProbs = _.map(numeric.transpose(speakerLogProbs), logNormalize);
  return _.map(listenerLogProbs, numeric.exp);
};

var trueS1Dist = function(theta, xs, ys) {
  var literalLogProbs = getLiteralLogProbs(theta, xs, ys);
  var speakerLogProbs = _.map(numeric.transpose(literalLogProbs), logNormalize);
  return _.map(speakerLogProbs, numeric.exp);
};

var literalDist = function(theta, xs, ys) {
  return _.map(getLiteralLogProbs(theta, xs, ys), numeric.exp);
};

var logNormalize = function(vec) {
  var max = Math.max.apply(null, vec);
  vec = numeric.sub(vec, max);
  return numeric.sub(vec, Math.log(numeric.sum(numeric.exp(vec))));
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

function maxInds(arr) {
  var maxVal = _.max(arr);
  return _.filter(_.range(arr.length), function(i) {
    return arr[i] === maxVal;
  });
}

function pragmaticStrength(literal, rsa) {
  return _.filter(_.zip(literal, rsa), function(pair) {
    var litRow = pair[0], rsaRow = pair[1];
    var litMaxInds = maxInds(litRow);
    var rsaMaxInds = maxInds(rsaRow);
    return _.intersection(litMaxInds, rsaMaxInds).length === 0;
  }).length;
}

numeric.precision = 3;

/*
  var theta = {
    '0':    0.25,
    '1':    0,
    '2':   -0.25,
    bias:   2,
    '0+1': -0.75,
    '0+2': -0.75,
    '1+2':  0.75,
  }
*/

while (true) {
  /*
  var theta = getRandomTheta();
  */
  var theta = {
    '0':    0.5,
    '1':    0.5,
    bias:  -1.0,
    '0+1': -0.5,
  }

  var xs = allBooleanVecs(NUM_ATTRS);
  var ys = allBooleanVecs(NUM_WORDS);
  var literal = literalDist(theta, xs, ys);
  var rsa = trueRSADist(theta, xs, ys);
  var s = pragmaticStrength(literal, rsa);
  console.log(s)
  if (s >= 2) {
    console.log('theta:');
    console.log(theta);
    console.log('literal:');
    console.log(numeric.prettyPrint(literal));
    console.log('rsa:');
    console.log(numeric.prettyPrint(rsa));
  }
  break;
}

return '';
