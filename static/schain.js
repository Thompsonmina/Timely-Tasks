

import { IMA } from '@skalenetwork/ima-js';
import Web3 from 'web3';

import schain_abis from '../skale/schainAbis.json'; // your local sources
import rinkerby_abis from "../skale/rinkerby_abis.json";

const MAINNET_ENDPOINT = 'https://powerful-floral-thunder.rinkeby.discover.quiknode.pro/69839a2cec7ab36eef0624ad28227d30c4dd667f/';
const SCHAIN_ENDPOINT = 'https://eth-online.skalenodes.com/v1/hackathon-complex-easy-naos';

const mainnetWeb3 = new Web3(Web3.givenProvider);
const sChainWeb3 = new Web3(Web3.givenProvider);

console.log(rinkerby_abis.deposit_box_eth_abi)
console.log(typeof (rinkerby_abis.deposit_box_eth_abi))

const ima = new IMA(mainnetWeb3, sChainWeb3, rinkerby_abis, schain_abis);

const schainName = "hackathon-complex-easy-naos"

export async function makeDeposit(address, value) {

    let txOpts = { // transaction options
        value: value,
        address: address,
        // privateKey: process.env.PRIVATE_KEY
    };

    console.log("yayoooo")

    await ima.mainnet.eth.deposit(
        schainName,
        txOpts
    );
}

export async function withdrawETH(address, value) {
    let txOpts = {
        address: address,
    };
    ima.schain.eth.withdraw(
        value,
        txOpts
    ).then(x => console.log("it worked"))
}

export async function retrieveETH(address) {
    let opts = {
        address: address,
    };
    // retrieve all ETH from DepositBox
    await ima.mainnet.eth.getMyEth(opts);
}

export async function getCommunityBalance(address) {
    let balance = await ima.mainnet.communityPool.balance(address, schainName);
    console.log(balance);
    return balance;

}

export async function rechargeCommunityPool(address, value) {
    await ima.mainnet.communityPool.recharge(
        schainName,
        address,
        {
            value: value,
            address: address,
        }
    );
}

export async function withdrawBalanceFromCommunityPool(address) {
    let opts = {
        address: address,
    };

    let balance = await ima.mainnet.communityPool.balance(address, schainName);
    console.log(balance);

    await ima.mainnet.communityPool.withdraw(
        schainName,
        balance,
        opts
    );
}
