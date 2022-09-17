import { makeDeposit, withdrawETH, withdrawBalanceFromCommunityPool, rechargeCommunityPool, retrieveETH, getCommunityBalance } from "./schain";
import { notification, notificationOff } from "./utils";


const performBridgeActionEth = async (provider, user_address, transaction, elem_name, success_message) => {
    console.log("transfer")
    const { name, chainId } = await provider.getNetwork()
    console.log(name)
    console.log(chainId, "hazzah?")
    if (name === "rinkeby" && chainId === 4) {
        // getCommunityBalance(user_address)
        console.log("here? aye")
        let amount = null
        if (elem_name != "") {
            console.log("inside if")
            const eth_amount = document.getElementById(elem_name).value
            amount = format_to_wei(eth_amount)
            console.log(amount)
        }

        try {
            console.log("whyyyyy")
            await transaction(user_address, amount)
            notification(`You have successfully ${success_message}`)
        }
        catch (e) {
            notification(`Error: ${e}`)
        }
    }
    else notification("You have to be on the rinkeby network to perform this action")
}


export async function bridgeEvents(provider, user_address) {
    console.log("whats going on here in the bridge")
    console.log(provider)

    document.querySelector("#transferToSkaleBtn").addEventListener("click", async (e) => performBridgeActionEth(provider, user_address, makeDeposit, "bridgedEthTransferAmount", "funded your schain account"));

    document.querySelector("#transferToPoolBtn").addEventListener("click", async (e) => performBridgeActionEth(provider, user_address, rechargeCommunityPool, "CommunityPoolAmount", "funded the community pool and should be able to exit"));
    document.querySelector("#withdrawFromPoolBtn").addEventListener("click", async (e) => performBridgeActionEth(provider, user_address, withdrawBalanceFromCommunityPool, "", "withdrawn your remaining funds from the community pool"));


    document.querySelector("#exitSkaleBtn").addEventListener("click", async (e) => {
        const { chainId } = await provider.getNetwork()
        console.log(chainId, "hazzah?")
        if (chainId === 647426021) {
            const eth_amount = document.getElementById("ethWithdrawAmount").value
            const amount = format_to_wei(eth_amount)
            console.log(amount)

            try {
                withdrawETH(user_address, amount).then(() =>
                    notification(`You have successfully moved your funds back into eth (deposit box) `))
            }
            catch (e) {
                notification(`Error: ${e}`)
            }
        }
        else notification("You have to be on the skale testnet network to perform this action")

    });

    document.querySelector("#withdrawIntoEthBtn").addEventListener("click", async (e) => performBridgeActionEth(provider, user_address, retrieveETH, "", "withdrawn all your funds from the eth lockbox"))
    const displayCommieUserBalance = async () => {
        console.log("whats going on in here")
        let community_balance = document.getElementById("commieBalance")
        if (community_balance) {
            community_balance.innerHTML = await getCommunityBalance(user_address)
        }
    }

    // displayCommieUserBalance()
    // getCommunityBalance(user_address).then(x => console.log(x))
}
