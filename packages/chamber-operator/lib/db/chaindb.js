const levelup = require('levelup');

/**
 * implements IChainDb
 */
class ChainDb {
  constructor(path) {
    this.db = levelup(path);
  }

  async contains(key) {
    return await this.db.get(key)
  }

  async insert(key, value) {
    await this.db.put(key, value)
    return true
  }

  async get(key) {
    return await this.db.get(key)
  }

  async delete(key) {
    return await this.db.del(key)
  }

}

module.exports = ChainDb
