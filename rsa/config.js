var _ = require('underscore');
var path = require('path');
var fs = require('fs');
var parseArgs = require('minimist');

module.exports = new (function () {
  var config = this;

  var optionDefs = {
    string: ['--run_dir'],
    boolean: [],
    alias: {},
    default: {},
  };

  var options = undefined;

  var preventOtherOptions = function (arg) {
    arg = arg.replace(/^-+/, '').replace(/=.*$/, '');
    if (!optionDefs.default.hasOwnProperty(arg) &&
        !optionDefs.alias.hasOwnProperty(arg) &&
        optionDefs.string.indexOf(arg) == -1 &&
        optionDefs.boolean.indexOf(arg) == -1) {
      if (arg.indexOf('-') === 0) {
        throw Error('received unexpected option "' + arg + '"');
      } else {
        throw Error('received unexpected positional argument "' + arg + '"');
      }
    }

    return true;
  }

  this.addOption = function(name, defaultValue, type, aliases) {
    optionDefs.default[name] = defaultValue;
    if (aliases) {
      optionDefs.alias[name] = aliases;
    }
    if (type === 'string' || type === 'boolean') {
      optionDefs[type].push(name);
    } else if (type) {
      throw Error('unknown type "' + type + '"; only "string", "boolean", ' +
                  'and undefined (for variable type with number parsing) ' +
                  'are accepted for option type');
    }
  }

  this.getOptions = function(allow_partial, args) {
    allow_partial = (allow_partial === undefined ? false : allow_partial);

    args = args || process.argv;
    if (args[1].indexOf('vipp') > -1) {
      // [ 'node', 'vipp', 'main.js', '--other', '--options' ]
      args = args.slice(3);
    } else {
      // [ 'node', 'main.js', '--other', '--options' ]
      args = args.slice(2);
    }

    if (allow_partial) {
      return parseArgs(args, optionDefs);
    } else {
      if (options === undefined) {
        options = parseArgs(args, _.extendOwn(optionDefs, {unknown: preventOtherOptions}));
      }
      return options;
    }
  };

  this.getFilePath = function(filename, allowUndefined) {
    var opts = config.getOptions(true);
    if (opts.run_dir) {
      return path.join(opts.run_dir, filename);
    } else if (!allowUndefined) {
      return filename;
    }
  };

  var emptyCallback = function(err) { if (err) console.log(err.stack); };

  this.redirectOutput = function() {
    var outfile = config.getFilePath('stdout.log', true);
    var errfile = config.getFilePath('stderr.log', true);
    if (outfile) {
      var origOut = process.stdout.write;
      process.stdout.write = function(string, encoding, fd) {
        origOut.apply(process.stdout, arguments);
        fs.appendFile(outfile, string, {encoding: encoding}, emptyCallback);
      };

      var origErr = process.stderr.write;
      process.stderr.write = function(string, encoding, fd) {
        origErr.apply(process.stderr, arguments);
        fs.appendFile(errfile, string, {encoding: encoding}, emptyCallback);
      };
    }
  }

  this.redirectOutput();

  this.dump = function(data, filename, lines, options) {
    var filePath = config.getFilePath(filename);
    if (lines) {
      try {
        var out = fs.createWriteStream(filePath, options);
        _.each(data, function(item) {
          out.write(JSON.stringify(item));
        })
      } catch(err) {
        console.log(err.stack);
      }
    } else {
      fs.writeFile(filePath, JSON.stringify(data), options, emptyCallback);
    }
  };

  this.dumpPretty = function(data, filename, options) {
    var filePath = config.getFilePath(filename);
    fs.writeFile(filePath, JSON.stringify(data, null, 2), options, emptyCallback);
  };
})();
