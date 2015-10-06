// Should print:
// TypeError (number is not a function) on line with countsDist();
// VIPP gives:
// TypeError (number is not a function) on one of the for loop lines
var countsDist = 0;

for (var k = 0; k < 20; k++) {
  for (var i = 0; i < 87; i++) {
    console.log(i + ',' + k);
    for (var j = 0; j < 5; j++) {
      console.log(i + ',' + j + ',' + k);
    }
  }

  for(var j = 0; j < 6; j++) {
    console.log(i + ',' + j);
  }
}

countsDist();

return '';
