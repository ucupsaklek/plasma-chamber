
/**
* @dev change owner
*/
function transfer(Tx transaction)
 internal
 pure
{


  // inputs

  // input
  var input = transaction.inputs[0];

  // args

  // newOwner
  var newOwner = transaction.args[0];

  // outputs

  // output
  var output = transaction.outputs[0];

  // requires

  address newOwner = RLP.toAddress(newOwner)
  

  require(output.owners[0] == newOwner);
  

}


