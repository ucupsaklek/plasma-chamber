const AggregateChain = artifacts.require("./AggregateChain.sol");
const RootChain = artifacts.require("./RootChain.sol");
const MultisigGame = artifacts.require("./MultisigGame.sol");

module.exports = async function(deployer) {
  await deployer.deploy(RootChain);
  const aggregateChain = await deployer.deploy(AggregateChain);
  await aggregateChain.addChain(RootChain.address)
  await deployer.deploy(MultisigGame);
};
