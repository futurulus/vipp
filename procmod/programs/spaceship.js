// var ModelStates = require('procmod/lib/modelstates');
var Geo = require('procmod/lib/geometry');
var SpaceshipGeo = require('procmod/programs/spaceshipGeo');
var THREE = require('three');

var map = function(fn, ar) {
  return ar.length === 0 ? [] : [fn(ar[0])].concat(map(fn, ar.slice(1)));
};

var expTransform = {
	fwd: Math.exp,
	rvs: Math.log
};

var makeProgram = function(isGuide) {

	var globalStore = {};

	// Create a new model state
	var newState = function()
	{
		// State which tracks the voxelized model
		// (Assumes availability of global 'voxparams')
		// return ModelStates.Sequential.Voxelizing.create(voxparams);

		// Simpler state which just tracks self-intersections
		// return ModelStates.Sequential.NonIntersecting.create();

		return [];
	}

	// Add geometry to an existing model state
	var addGeometry = function(geo)
	{
		// var currstate = globalStore.modelState;
		// var newstate = currstate.addGeometry(geo);
		// globalStore.modelState = newstate;
		// // This extra bit of logic is to prevent NaNs (from -Infinity - -Infinity calculations)
		// var score = (currstate.score == -Infinity) ? -Infinity : (newstate.score - currstate.score);
		// factor(score);

		globalStore.modelState = globalStore.modelState.concat([geo]);
	}


	// ----------------------------------------------------------------------------

	// Parameter function
	var prm;

	var _uniform = function(lo, hi) {
		var p1 = prm(lo);
		var p2 = prm(hi - lo, expTransform);
		return uniform(p1, p1 + p2);
	}

	var _flip = function(p) {
		return flip(prm(p));
	}

	var _discrete = function(probs) {
		return discrete(map(function(x) { return prm(x); }, probs));
	}

	var _uniformrel = function(lo, hi)
	{
		var u = _uniform(0, 1);
		return (1-u)*lo + u*hi;
	}

	var wi = function(i, w) { return Math.exp(-w*i); }


	// ----------------------------------------------------------------------------

	// Subroutines for random spaceship geometry generation.

	var addBoxBodySeg = function(rearz, prev)
	{
		// Must be bigger than the previous segment, if the previous
		//   segment was not a box (i.e. was a cylinder-type thing)
		var xl = _uniform(1, 3);
		var yl = _uniform(.5, 1) * xl;
		var xlen = (prev.type === BodyType.Box) ? xl : Math.max(xl, prev.xlen);
		var ylen = (prev.type === BodyType.Box) ? yl : Math.max(yl, prev.ylen);
		var zlen = _uniform(2, 5);
		var geo = Geo.Shapes.Box(0, 0, rearz + 0.5*zlen, xlen, ylen, zlen);
		addGeometry(geo);
		return { xlen: xlen, ylen: ylen, zlen: zlen, type: BodyType.Box };
	}

	var addCylinderBodySeg = function(rearz, prev, isnose)
	{
		// Must be smaller than previous segment, if that was a box
		var limitrad = 0.5*Math.min(prev.xlen, prev.ylen);
		var minrad = (prev.type === BodyType.Box) ? 0.4*limitrad : 0.3;
		var maxrad = (prev.type === BodyType.Box) ? limitrad : 1.25;
		var radius = _uniformrel(minrad, maxrad);
		var xlen = radius*2;
		var ylen = radius*2;
		var zlen = isnose ? _uniform(1, 3) : _uniform(2, 5);
		var geo = isnose ? SpaceshipGeo.BodyCylinder(rearz, zlen, radius,
													 radius*_uniform(.25, .75))
						 : SpaceshipGeo.BodyCylinder(rearz, zlen, radius);
		addGeometry(geo);
		return { xlen: xlen, ylen: ylen, zlen: zlen, type: BodyType.Cylinder };
	}

	var addClusterBodySeg = function(rearz, prev, isnose)
	{
		// Must be smaller than previous segment, if that was a box
		var limitrad = 0.25*Math.min(prev.xlen, prev.ylen);
		var minrad = (prev.type === BodyType.Box) ? 0.4*limitrad : 0.5*0.3;
		var maxrad = (prev.type === BodyType.Box) ? limitrad : 0.5*1.25;
		var radius = _uniformrel(minrad, maxrad);
		var xlen = radius*4;
		var ylen = radius*4;
		var zlen = _uniform(2, 5);
		var geo = SpaceshipGeo.BodyCluster(rearz, zlen, radius);
		addGeometry(geo);
		return { xlen: xlen, ylen: ylen, zlen: zlen, type: BodyType.Cluster };
	}

	var BodyType = { Box: 0, Cylinder: 1, Cluster: 2, N: 3 }
	var addBodySeg = function(rearz, prev)
	{	
		// var type = randomInteger(BodyType.N);
		var type = _discrete([.33, .33, .33]);
		if (type == BodyType.Box)
			return addBoxBodySeg(rearz, prev)
		else if (type == BodyType.Cylinder)
			return addCylinderBodySeg(rearz, prev);
		else if (type == BodyType.Cluster)
			return addClusterBodySeg(rearz, prev);
		else throw('unsupported body type');
	}

	var addBoxWingSeg = function(xbase, zlo, zhi)
	{
		var zbase = _uniformrel(zlo, zhi);
		var xlen = _uniform(0.25, 2.0);
		var ylen = _uniform(0.25, 1.25);
		var zlen = _uniform(0.5, 4.0);
		var geo = SpaceshipGeo.WingBoxes(xbase, zbase, xlen, ylen, zlen);
		addGeometry(geo);
		if (_flip(0.5))
			addWingGuns(xbase, zbase, xlen, ylen, zlen);
		return { xlen: xlen, ylen: ylen, zlen: zlen, zbase: zbase };
	}

	var addWingGuns = function(xbase, zbase, xlen, ylen, zlen)
	{
		var gunlen = _uniform(1, 1.2)*zlen;
		var gunxbase = xbase + 0.5*xlen;
		var gunybase = 0.5*ylen;
		var geo = SpaceshipGeo.WingGuns(gunxbase, gunybase, zbase, gunlen);
		addGeometry(geo);
	};

	var addCylinderWingSeg = function(xbase, zlo, zhi)
	{
		var zbase = _uniformrel(zlo, zhi);
		var radius = _uniform(.15, .7);
		var xlen = 2*radius;
		var ylen = 2*radius;
		var zlen = _uniform(1, 5);
		var geo = SpaceshipGeo.WingCylinders(xbase, zbase, zlen, radius);
		addGeometry(geo);
		return { xlen: xlen, ylen: ylen, zlen: zlen, zbase: zbase };
	}

	var WingType = { Box: 0, Cylinder: 1, N: 2 }
	var addWingSeg = function(xbase, zlo, zhi)
	{
		// var type = randomInteger(WingType.N);
		var type = _flip(0.5) + 0;
		if (type == WingType.Box)
			return addBoxWingSeg(xbase, zlo, zhi);
		else if (type == WingType.Cylinder)
			return addCylinderWingSeg(xbase, zlo, zhi);
		else throw('unsupported wing type');
	}

	var addWings = function(i, xbase, zlo, zhi)
	{
		var rets = addWingSeg(xbase, zlo, zhi);
		var xlen = rets.xlen;
		var ylen = rets.ylen;	
		var zlen = rets.zlen;
		var zbase = rets.zbase;
		if (_flip(wi(i, 0.6)))
			addWings(i+1, xbase+xlen, zbase-0.5*zlen, zbase+0.5*zlen);
	}

	var addFin = function(i, ybase, zlo, zhi, xmax)
	{
		var xlen = _uniform(0.5, 1.0) * xmax;
		var ylen = _uniform(0.1, 0.5);
		var zlen = _uniform(0.5, 1.0) * (zhi - zlo);
		var zbase = 0.5*(zlo + zhi);
		var geo = Geo.Shapes.Box(0, ybase + 0.5*ylen, zbase, xlen, ylen, zlen);
		addGeometry(geo);
		if (_flip(wi(i, 0.2)))
			addFin(i+1, ybase+ylen, zbase-0.5*zlen, zbase+0.5*zlen, xlen);
	}

	var addBody = function(i, rearz, prev)
	{
		// Gen new body segment
		var rets = addBodySeg(rearz, prev);
		var xlen = rets.xlen;
		var ylen = rets.ylen;
		var zlen = rets.zlen;
		var bodyType = rets.type;
		// Gen wings?
		var wingprob = wi(i+1, 0.5);
		if (_flip(wingprob))
			addWings(0, 0.5*xlen, rearz+0.5, rearz+zlen-0.5);
		// Gen fin?
		var finprob = 0.7;
		if (_flip(finprob))
			addFin(0, 0.5*ylen, rearz, rearz+zlen, 0.6*xlen);
		// Continue generating?
		var nextprev = {type: bodyType, xlen: xlen, ylen: ylen};
		if (_flip(wi(i, 0.4)))
		{
			addBody(i+1, rearz+zlen, nextprev);
		}
		else
		{	
			// TODO: Also have a box nose, like the old version?
			if (_flip(0.75))
				addCylinderBodySeg(rearz+zlen, nextprev, true);
		}
	}

	// ----------------------------------------------------------------------------

	var _factor = isGuide ? function() {} : factor;
	var gaussFactor = function(x, mu, sigma) {
		_factor(gaussianERP.score([mu, sigma], x));
	}

	// This is the 'main' function of the program
	var generate = function(params)
	{
		if (isGuide)
			prm = function(v, t, s, h) { return param(params, v, t, s, h); };
		else
			prm = function(x) { return x; };

		globalStore.modelState = newState();
		addBody(0, -5, {type: null, xlen: 0, ylen: 0});

		// Encourage desired aspect ratio
		var bbox = new THREE.Box3();
		for (var i = 0; i < globalStore.modelState.length; i++)
			bbox.union(globalStore.modelState[i].getbbox());
		var size = bbox.size();
		var targetWidth = 10;
		var targetLength = 10;
		gaussFactor(size.x, targetWidth, 0.1);
		gaussFactor(size.z, targetLength, 0.1);

		return globalStore.modelState;
	}

	return generate;

};


// // Forward sampling test
// var generate = makeProgram(false);
// var utils = require('procmod/lib/utils');
// var geolist = generate();
// var accumgeo = new Geo.Geometry();
// for (var i = 0; i < geolist.length; i++)
// 	accumgeo.merge(geolist[i]);
// utils.saveOBJ(accumgeo, 'test.obj');


// Mean field variational test
var target = makeProgram(false);
var guide = makeProgram(true);
var result = infer(target, guide, undefined, {
	verbosity: 2,
	nSamples: 100,
	nSteps: 1000,
	convergeEps: 0.1,
	initLearnrate: 0.5
});
var utils = require('procmod/lib/utils');
for (var i = 0; i < 10; i++) {
	var geolist = guide(result.params);
	var accumgeo = new Geo.Geometry();
	for (var i = 0; i < geolist.length; i++)
		accumgeo.merge(geolist[i]);
	var size = accumgeo.getbbox().size();
	console.log(size.x, size.z);
	utils.saveOBJ(accumgeo, 'test_' + i + '.obj');
}







