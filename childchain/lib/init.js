const Chain = require("./chain");
const Snapshot = require("./state/snapshot")
const levelup = require('levelup');
const leveldown = require('leveldown');

module.exports = {
    run: async _=>{
        const blockDB = levelup(leveldown('./block'));
        const metaDB = levelup(leveldown('./meta'));
        const snapshotDB = levelup(leveldown('./snapshot'));
        const childChain = new Chain();
        childChain.setMetaDB(metaDB);
        childChain.setBlockDB(blockDB);
        const snapshot = new Snapshot();
        snapshot.setDB(snapshotDB);
        childChain.setSnapshot(snapshot);
        await childChain.setChainID("NKJ23H3213WHKHSAL");
        await childChain.init();
        return childChain;
    }
}