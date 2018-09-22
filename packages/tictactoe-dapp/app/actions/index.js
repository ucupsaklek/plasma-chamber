import Web3 from 'web3'

export const WEB3_CONNECTED = 'WEB3_CONNECTED';
export const FETCH_BLOCK_NUMBER = 'FETCH_BLOCK_NUMBER';


export function web3connect() {
  return (dispatch) => {
    const web3 = window.web3;
    if (typeof web3 !== 'undefined') {
      dispatch({
        type: WEB3_CONNECTED,
        payload: new Web3(web3.currentProvider)
      });
    }else{
      const web3 = new Web3(new Web3.providers.HttpProvider(
        process.env.ENDPOINT || 'http://127.0.0.1:3000'
      ));
      dispatch({
        type: WEB3_CONNECTED,
        payload: web3
      });
    }
  };
}

export function fetchBlockNumber() {
  return (dispatch, getState) => {
    const web3 = getState().web3;
    return web3.eth.getBlockNumber().then(blockNumber => {
      console.log("last block number: ", blockNumber);
      dispatch({
        type: FETCH_BLOCK_NUMBER,
        payload: blockNumber
      });
    });
  };
}
