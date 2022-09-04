import { ethers } from "ethers";
import timely_tasks_artefacts from '../out/tasks.sol/Tasks.json'

const timely_tasks_Abi = timely_tasks_artefacts["abi"]
const timely_tasksContractAddress = "0xD78E1f1EF8AC352fE5A947A78dBcB24E03f9F547"

let contract
let tasks = []
let provider
let user_address

const active = 0
const locked = 1
const complete = 2
const annuled = 3

const connectMetaMaskWallet = async function () {
    if (window.ethereum) {

        notification("⚠️ Please approve this DApp to use it.")
        try {
            provider = new ethers.providers.Web3Provider(
                window.ethereum,
                "any"
            );
            console.log("here?");
            await provider.send("eth_requestAccounts", []);
            const signer = provider.getSigner();
            user_address = await signer.getAddress();

            console.log(user_address);
            contract = new ethers.Contract(timely_tasksContractAddress, timely_tasks_Abi, signer);
            console.log("new boss aye")
        }
        catch (error) {
            notification(`⚠️ ${error}.`)
        }
    }
    else {
        notification("⚠️ Please install Metamask.")
    }
}

const getBalance = async function (address) {
    let balance = await provider.getBalance(address)
    balance = ethers.utils.formatEther(balance);
    return balance
}

const displayUserBalance = async function () {
    document.querySelector("#balance").textContent = await getBalance(user_address);
}

function notification(_text) {
    document.querySelector(".alert").style.display = "block"
    document.querySelector("#notification").textContent = _text
}

function notificationOff() {
    document.querySelector(".alert").style.display = "none"
}

window.addEventListener("load", async () => {
    notification("⌛ Loading...")
    await connectMetaMaskWallet()
    displayUserBalance()
    notificationOff()
})

