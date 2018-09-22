import { WEB3_CONNECTED, FETCH_BLOCK_NUMBER } from '../actions';

const defaultState = {};

const reducer = (state = defaultState, action) => {
  switch (action.type) {
  case WEB3_CONNECTED:
    return Object.assign({}, state, {web3: action.payload});
  case FETCH_BLOCK_NUMBER:
    return Object.assign({}, state, {blockNumber: action.payload});
  default:
    return state
  }
};

export default reducer;
