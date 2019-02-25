const Trie = require('merkle-patricia-tree');
const levelup = require('levelup');

/**
 * implements ISnapshotDb
 */
class SnapshotDb {
  
  constructor(path) {
    this.db = levelup(path)
    this.contTrie = new Trie(this.db);
    this.contTrie.revert();
  }
  
  getRoot() {
    return this.contTrie.root.toString('hex');
  }
  
  setRoot(root) {
    this.contTrie = new Trie(this.db, Buffer.from(root, 'hex'));
  }

  commit() {
    this.contTrie.commit()
  }

  revert() {
    this.contTrie.revert()
  }

  /**
   * contains contract or not
   * @param {*} id SnapshotId of contract
   */
  contains(id) {
    return new Promise((resolve, reject) => {
      this.contTrie.get(id, (err, value) => {
        if(err || value == null) {
          resolve(false);
        }else{
          resolve(true);
        }
      });
    })
  }

  /**
   * delete contract
   * @param {*} id SnapshotId of contract
   */
  deleteId(id) {
    return new Promise((resolve, reject) => {
      this.contTrie.del(id, () => {
        resolve(true);
      });
    })
  }

  /**
   * insert contract
   * @param {*} id SnapshotId of contract
   */
  insertId(id) {
    return new Promise((resolve, reject) => {
      this.contTrie.put(id, id, () => {
        resolve()
      });
    })
  }
  
  commit() {
    return new Promise((resolve, reject) => {
      this.contTrie.checkpoint();
      this.contTrie.commit(() => {
        resolve();
      });
    })
  }

}

module.exports = SnapshotDb
