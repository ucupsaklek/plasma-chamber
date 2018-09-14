const Chain = require("./chain");
const Snapshot = require("./state/snapshot")
const levelup = require('levelup');
const leveldown = require('leveldown');

module.exports = {
    run: async _=>{
        const blockDB = levelup(leveldown('./block'));
        const snaphostDB = levelup(leveldown('./snapshot'));
        const childChain = new Chain();
        childChain.setDB(blockDB);
        const snapshot = new Snapshot();
        snapshot.setDB(snapshotDB);
        childChain.setSnapshot(snapshot);
        await childChain.loadBlocks();
        return childChain;
    }
}