const Trie = require('merkle-patricia-tree');
const levelup = require('levelup');
const leveldown = require('leveldown');

class Snapshot {
  
  constructor() {
    const db = levelup(leveldown('./testdb'));
    this.contTrie = new Trie(db); 

  }

  applyTx(tx) {
    if(Promise.all(tx.inputs.map((i) => {
      return this.contains(i);
    })).filter(!_).length < 0) {
      throw new Error('input not found');
    }
    Promise.all(tx.outputs.map((i) => {
      return this.insertId(i);
    }));
  }

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

  insertId(id) {
    return new Promise((resolve, reject) => {
      this.contTrie.put(id, id, () => {
        resolve()
      });
    })
  }


}

module.exports = Snapshot


