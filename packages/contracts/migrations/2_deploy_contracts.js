const ERC721 = artifacts.require("ERC721")
const TestPlasmaToken = artifacts.require("TestPlasmaToken")
const RootChain = artifacts.require("RootChain")
const CustomVerifier = artifacts.require("CustomVerifier")
const VerifierUtil = artifacts.require("VerifierUtil")
const OwnershipPredicate = artifacts.require("OwnershipPredicate")
const SwapChannelPredicate = artifacts.require("SwapChannelPredicate")
const Serializer = artifacts.require("Serializer")
const FastFinality = artifacts.require("FastFinality")
const Checkpoint = artifacts.require("Checkpoint")

module.exports = (deployer) => {
  let rootChain
  let fastFinality
  let checkpoint
  let customVerifier
  deployer.deploy(ERC721)
  .then(() => deployer.deploy(Checkpoint))
  .then((_checkpoint) => {
    checkpoint = _checkpoint
    return deployer.deploy(VerifierUtil)
  })
  .then(() => deployer.deploy(OwnershipPredicate, VerifierUtil.address))
  .then(() => deployer.deploy(Serializer))
  .then(() => deployer.deploy(
    CustomVerifier,
    VerifierUtil.address,
    OwnershipPredicate.address
  ))
  .then((_customVerifier) => {
    customVerifier = _customVerifier
    return customVerifier.registerPredicate(OwnershipPredicate.address)
  })
  .then(() => deployer.deploy(
    RootChain,
    VerifierUtil.address,
    Serializer.address,
    CustomVerifier.address,
    ERC721.address,
    Checkpoint.address
  ))
  .then((_rootChain) => {
    rootChain = _rootChain
    return rootChain.setup()
  })
  .then(() => deployer.deploy(SwapChannelPredicate, VerifierUtil.address, RootChain.address))
  .then(() => {
    return customVerifier.registerPredicate(SwapChannelPredicate.address)
  })
  .then(() => deployer.deploy(TestPlasmaToken, "0x505050", "0x505050", 1, 100000))
  .then(() => {
    return rootChain.listToken(TestPlasmaToken.address, 1)
  })
  .then(() => {
    return checkpoint.setRootChain(RootChain.address)
  })
  .then(() => deployer.deploy(
      FastFinality,
      RootChain.address,
      CustomVerifier.address,
      ERC721.address
  ))
  .then((_fastFinality) => {
    fastFinality = _fastFinality
    return rootChain.getTokenAddress.call()
  })
  .then((exitNFT) => {
    console.log('exitNFT', exitNFT)
    return fastFinality.getTokenAddress.call()
  })
  .then((ffNFT) => {
    console.log('ffNFT', ffNFT)
  })
}
