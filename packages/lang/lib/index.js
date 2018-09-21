const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const peg = require('pegjs');

const src = fs.readFileSync(path.join(__dirname, '../examples/tictoctoe.chr'));
const solTemplate = fs.readFileSync(path.join(__dirname, './sol.ejs'));
const psrc = fs.readFileSync(path.join(__dirname, './chamber.peg'));
const parser = peg.generate(psrc.toString());
const result = parser.parse(src.toString());
console.log(JSON.stringify(result));

const template = ejs.compile(solTemplate.toString(), {});
const output = template({
  facts: result
});
console.log(output);

fs.writeFileSync(path.join(__dirname, '../examples/tictoctoe.sol'), output);
