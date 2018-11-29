const assert = require('assert');
const {
  ChildChainApi
} = require('../lib');

describe('ChildChainApi', function() {

  it('should create instance', async function() {
    const endpoint = 'https://example.com/'
    const api = new ChildChainApi(endpoint)
    assert.equal(api.endpoint, endpoint)
  });

});
