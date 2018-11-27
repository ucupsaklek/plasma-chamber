const fs = require('fs');
const path = require('path');
const peg = require('pegjs');

const psrc = fs.readFileSync(path.join(__dirname, './chamber.peg'));

module.exports = function(src) {
  const parser = peg.generate(psrc.toString());
  return parser.parse(src);
}
