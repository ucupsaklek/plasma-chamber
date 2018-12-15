const RootChain = artifacts.require("./RootChain.sol");
const PlasmaChain = artifacts.require("./PlasmaChain.sol");
const MultisigGame = artifacts.require("./MultisigGame.sol");

module.exports = async function(deployer) {
  await deployer.deploy(PlasmaChain);
  const rootChain = await deployer.deploy(RootChain);
  await rootChain.addChain(PlasmaChain.address)
  await deployer.deploy(MultisigGame);
};
