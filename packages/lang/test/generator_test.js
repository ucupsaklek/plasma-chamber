const assert = require('assert');

const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const peg = require('pegjs');


describe('generator', function() {
  it('should parse and generate', function(done) {
    const src = fs.readFileSync(path.join(__dirname, '../examples/tictoctoe.chr'));
    const solTemplate = fs.readFileSync(path.join(__dirname, '../lib/sol.ejs'));
    const psrc = fs.readFileSync(path.join(__dirname, '../lib/chamber.peg'));
    const parser = peg.generate(psrc.toString());
    const result = parser.parse(src.toString());
    const template = ejs.compile(solTemplate.toString(), {});
    const output = template({
      facts: result
    });
    assert.equal(output.toString().length > 0, true);
    done()
  });
});
