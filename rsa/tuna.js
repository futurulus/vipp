var fs = require('fs');
var xml2js = require('xml2js');

var read = function(filename) {
  return fs.readFileSync(filename, 'utf8');
}
var parseXml = function(xmlStr) {
  var xmlObj;
  xml2js.parseString(xmlStr, function (err, result) {
    if (err) {
      throw err;
    }
    xmlObj = result;
  });
  return xmlObj;
};

var trial = parseXml(read('TUNA/corpus/singular/people/s101t21.xml'));
//console.log(JSON.stringify(trial, null, 4));

return trial;
