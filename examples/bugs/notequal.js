// Correct answer: false (should parse to "false && ...", which by
// short-circuit should evaluate to false)
// VIPP gives: true (perhaps parses to "... !== 'object'"?)
// Note that typeof is somehow important to this bug--
// (false && false !== false) correctly evaluates to false.
console.log(false && typeof(false) !== 'object');
return '';
