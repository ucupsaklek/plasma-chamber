const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const compiler = require('./compiler');

const src = fs.readFileSync(path.join(__dirname, '../examples/tictoctoe.chr'));
const solTemplate = fs.readFileSync(path.join(__dirname, './sol.ejs'));

const result = compiler(src.toString());
console.log(JSON.stringify(result));

const template = ejs.compile(solTemplate.toString(), {});
const output = template({
  facts: result
});
console.log(output);

fs.writeFileSync(path.join(__dirname, '../examples/tictoctoe.sol'), output);
