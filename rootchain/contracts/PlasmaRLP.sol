pragma solidity ^0.4.0;

import "./RLP.sol";


/**
 * @dev base on https://github.com/omisego/plasma-mvp/blob/master/plasma/root_chain/contracts/PlasmaRLP.sol
 */
library PlasmaRLP {

    struct exitingTx {
        address token;
        address owner;
        uint256 weight;
        bytes cont;
        uint256 inputCount;
    }

    /* Public Functions */

    function getUtxoPos(bytes memory challengingTxBytes, uint256 oIndex)
        internal
        constant
        returns (uint256)
    {
        var txList = RLP.toList(RLP.toRlpItem(challengingTxBytes));
        uint256 oIndexShift = oIndex * 3;
        return
            RLP.toUint(txList[0 + oIndexShift]) +
            RLP.toUint(txList[1 + oIndexShift]) +
            RLP.toUint(txList[2 + oIndexShift]);
    }

    function createExitingTx(bytes memory exitingTxBytes, uint256 oindex)
        internal
        constant
        returns (exitingTx)
    {
        var txList = RLP.toList(RLP.toRlpItem(exitingTxBytes));
        return exitingTx({
            token: RLP.toAddress(txList[6]),
            // owner or null
            owner: RLP.toAddress(txList[8 + 2 * oindex]),
            // weight
            weight: RLP.toUint(txList[8 + 2 * oindex]),
            // contract
            cont: RLP.toBytes(txList[8 + 2 * oindex]),
            inputCount: RLP.toUint(txList[0]) * RLP.toUint(txList[3])
        });
    }
}
