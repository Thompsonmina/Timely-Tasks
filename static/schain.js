


// import { IMA } from '@skalenetwork/ima-js';

// import schainAbi from '../skale/schainAbi.json'; // your local sources

// const MAINNET_ENDPOINT = 'https://powerful-floral-thunder.rinkeby.discover.quiknode.pro/69839a2cec7ab36eef0624ad28227d30c4dd667f/';
// const SCHAIN_ENDPOINT = 'https://eth-online.skalenodes.com/v1/hackathon-complex-easy-naos';

// const mainnetWeb3 = new Web3(MAINNET_ENDPOINT);
// const sChainWeb3 = new Web3(SCHAIN_ENDPOINT);

// let ima = new IMA(mainnetWeb3, sChainWeb3, mainnetAbi, schainAbi);


export async function makeDeposit(ima) {
    let schainName = "hackathon-complex-easy-naos";

    let address = "0xB894EB1501DcF5DE3a270793F7f87472AD423680";

    let txOpts = { // transaction options
        value: ima.mainnet.web3.utils.toWei("0.001", "ether"),
        address: address,
    };

    await ima.mainnet.eth.deposit(
        schainName,
        txOpts
    );
}


// makeDeposit(ima)