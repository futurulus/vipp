var fs = require('fs');
var zlib = require('zlib');
var liner = require('./liner');

module.exports = new(function() {
  var glove = this;

  this.VECTORS = undefined;

  this.readyCallback = undefined;

  var loadGlove = function(filename) {
    var vectors = {};
    var i = 0;
    process.stdout.write('Reading GloVe vectors');
    var stream = fs.createReadStream(filename);
    var unzipper = zlib.createGunzip();
    stream.pipe(unzipper).pipe(liner);

    liner.on('readable', function() {
      var line;
      while (line = liner.read()) {
        var elems = line.split(' ');
        vectors[elems[0]] = new Float64Array(elems.slice(1));

        i++;
        if (i % 50000 == 0) process.stdout.write('.');
      }
    });

    liner.on('end', function() {
      glove.VECTORS = vectors;
      process.stdout.write('done.\n');
      if (glove.readyCallback) {
        glove.readyCallback();
      }
    });
  };

  loadGlove('rsa/data/glove.6B.300d.txt.gz');

  this.onReady = function(callback) {
    if (glove.VECTORS !== undefined) {
      callback();
      return true;
    }

    glove.readyCallback = callback;
  };
})();
