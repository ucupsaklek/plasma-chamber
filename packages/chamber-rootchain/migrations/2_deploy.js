var RootChain = artifacts.require("./RootChain.sol");
var MultisigGame = artifacts.require("./MultisigGame.sol");

module.exports = function(deployer) {
//  await deployer.deploy(MultisigGame);
  deployer.deploy(RootChain);
};
