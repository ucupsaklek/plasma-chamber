const VirtualMachine = require("./vm");
const { Assembler, assembleSource } = require("./asm/asm");
const { PlasmaStateContract, PlasmaStateValue } = require('./state');

module.exports = {
  Assembler,
  assembleSource,
  PlasmaStateContract,
  PlasmaStateValue,
  VirtualMachine
}
