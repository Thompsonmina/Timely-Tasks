import timely_tasks_artefacts from '../out/tasks.sol/Tasks.json'
import schain_abis from '../skale/schainAbis.json';
import { notification, notificationOff, format_to_wei } from "./utils";
import { bridgeEvents } from "./bridge_actions";


import { ethers } from "ethers";


const timely_tasks_Abi = timely_tasks_artefacts["abi"];
const erc20Abi = schain_abis.eth_erc20_abi;
const timely_tasksContractAddress = "0xf798a437F7d7819255D58aF56b16faB79768D699";
const etherc20Address = schain_abis.eth_erc20_address;

let contract;
let erc20_contract;
let tasks = [];
let provider;
let user_address;
let registered_users_hashes = [];
let registered_users = []

const temp_hash = "test_hash"

let user_hash;
const signal = "timely tasks";
const action_id = "wid_staging_0906d5a67796091e7b2b07767ab54dfd";

worldID.init("world-id-container", {
    enable_telemetry: true,
    action_id: action_id,
    signal: signal,
    on_success: (proof) => onWorldcoinSuccess(proof)
});

async function onWorldcoinSuccess(proof) {
    console.log(proof);
    const body = {
        "merkle_root": proof.merkle_root,
        "nullifier_hash": proof.nullifier_hash,
        "action_id": action_id,
        "signal": signal,
        "proof": proof.proof
    }

    let nullifier_hash;

    const url = "https://developer.worldcoin.org/api/v1/verify"
    fetch(url, {
        Method: 'POST',
        Headers: {
            'Content-Type': 'application/json'
        },
        Body: body,
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error('Network response was not OK');
            }
            return response.json();
        })
        .then((data) => nullifier_hash = data.nullifier_hash)
        .catch((err) => console.log(err));


    window.localStorage.setItem("user_hash", nullifier_hash)
    if (registered_users_hashes.includes(nullifier_hash)) {
        document.getElementById("user-dialogue-modal").innerHTML = userFlowTemplate(false);

    } else {

        document.getElementById("user-dialogue-modal").innerHTML = userFlowTemplate(true);
        document.querySelector("#createProfileBtn").addEventListener("click", async (e) => {
            let username = document.getElementById("username");
            if (username.value != "" && user_hash != null) {
                try {
                    await contract.create_user(user_hash, username.value);
                } catch (error) { notification(`something went wrong: ${error}`) }

            } else {
                notification("could not create user, username value should be given")
            }
        })
    }

}


function userFlowTemplate(is_new) {

    let user_create_form = `<form id="user-creation-form">
                <div class="form-row">
                    <div class="col">
                        <input type="text" id="username" class="form-control mb-2"
                            placeholder="Enter your username" />
                    </div>
                </div>
            </form>
            `

    return `    <div class="modal-header">
                    <h5 class="modal-title">Timely Tasks</h5>
                </div>
                <div class="modal-body">
                    ${is_new ? user_create_form : "dive in"}
                </div>
                <div class="modal-footer" id="user-flow-footer">
                    <button type="button" class="btn btn-primary" ${is_new ? 'id="createProfileBtn">Create Profile' : 'data-dismiss="modal">Log in'} </button>
                </div>
                `

}


const active = 0
const locked = 1
const complete = 2
const annuled = 3

const getAllUsers = async function () {
    await getUsersHashes();
    console.log("got past here? hashes")

    const _users = [];

    for (let i = 0; i < registered_users_hashes.length; i++) {
        let _user = new Promise(async (resolve, reject) => {
            let p = await contractusers(registered_users_hashes[i])
            resolve({
                user_hash: registered_users_hashes[i],
                username: p[1],
                address: p[0],
            })
        })
        _users.push(_user)
    }
    console.log("wow")
    registered_users = await Promise.all(_users)
    console.log(registered_users)

}

const getUsersHashes = async function () {
    console.log("at least here")

    let users_length = await contract.getNullifiersLength()
    users_length = ethers.BigNumber.from(users_length).toNumber()
    const _users_hashes = []

    console.log("hash here??")

    for (let i = 0; i < users_length; i++) {
        let user_hash = new Promise(async (resolve, reject) => {
            let hash = await contract.nullifiers(i);
            resolve(hash);
        })
        _users_hashes.push(user_hash);
    }
    console.log("wow")
    registered_users_hashes = await Promise.all(_users_hashes);
}


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
            console.log("not here ayee")
            erc20_contract = new ethers.Contract(etherc20Address, erc20Abi, signer);
            console.log("new boss aye")
            console.log(contract)
            console.log(erc20_contract)
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
    let balance = await erc20_contract.balanceOf(user_address)
    balance = ethers.utils.formatEther(balance);
    return balance
}

const displayUserBalance = async function () {
    document.querySelector("#balance").textContent = await getBalance(user_address);
}


const getTasks = async function () {
    let _taskslength = await contract.TasksLength()
    _taskslength = ethers.BigNumber.from(_taskslength).toNumber()
    console.log(_taskslength, "tasks length")
    const _tasks = []

    for (let i = 0; i < _taskslength; i++) {
        let _product = new Promise(async (resolve, reject) => {
            let p = await contract.getTaskInfo(i)
            resolve({
                index: i,
                owner: p[0],
                locker: p[1],
                taskdesc: p[2],
                proof: p[3],
                contact: p[4],
                prize: ethers.BigNumber.from(p[5]),
                duration: p[6],
                startime: p[7],
                lockcost: ethers.BigNumber.from(p[8]),
                state: p[9]
            })
        })
        _tasks.push(_product)
    }
    console.log("wow")
    tasks = await Promise.all(_tasks)
    console.log(tasks)

    renderTasks(tasks)
}



function identiconImg(_address, size = 48) {
    const icon = blockies
        .create({
            seed: _address,
            size: 8,
            scale: 16,
        })
        .toDataURL()

    return `< img src = "${icon}" width = "${size}" alt = "${_address}" > `
}

function identiconTemplate(_address) {
    return `
        < div class="rounded-circle overflow-hidden d-inline-block border border-white border-2 shadow-sm m-0" >
            <a href="https://hackathon-complex-easy-naos.explorer.eth-online.skalenodes.com/address/${_address}/transactions"
                target="_blank">
                ${identiconImg(_address)}
            </a>
	  </div >
        `
}

function turnStateToString(stateint) {
    if (stateint == active) return "active"
    else if (stateint == annuled) return "annuled"
    else if (stateint == complete) return "completed"
    else if (stateint == locked) return "locked"
}

function taskTemplate(_task) {
    let buttons = []
    buttons[active] = `< a class="btn  btn-primary" data - action="lock" id = "${_task.index}" >
        Lock in task for ${ethers.utils.formatEther(_task.lockcost)} eth</a > `
    buttons[locked] = `< a class="btn  btn-danger .disabled" id = "${_task.index}" >
        task locked by ${identiconImg(_task.locker, 24)}</a > `
    let completebtn = `< a class="btn  btn-success .completeBtn" data - action="complete" id = "${_task.index}" >
        Mark as Completed</a > `
    let annulbtn = `< a class="btn  btn-danger .annulBtn" data - action="annul" id = "${_task.index}" >
        Unlist Task</a > `
    let unlocktask = `< a class="btn  btn-danger .unlockBtn" data - action="unlock" id = "${_task.index}" >
        Unlock Task</a > `

    let isowner = _task.owner === user_address
    return `
            < div class="card mb-4" >
                <div class="card-body text-left p-4 position-relative">
                    <!-- <div class="translate-middle-y position-absolute top-0"> -->
                        ${identiconTemplate(_task.owner)}
                        <!-- </div> -->
                    <h5 class="card-title">Task Description</h5>
                    <p class="card-text mb-1">
                        ${_task.taskdesc}
                    </p>
                    <h5 class="card-title "> Expected Deliverables</h5>
                    <p>${_task.proof} </p>
                    <p> Task Prize: ${ethers.utils.formatEther(_task.lockcost)} eth <br>Contact Info: ${_task.contact}
                        <br>Lock Duration: ${_task.duration / 3600} hour(s)
                            <br><span class="badge ${_task.state == 1 ? " bg-danger" : "bg-secondary"}">${turnStateToString(_task.state)}</span>
                        </p>

                        <div class="">
                            ${!isowner ? _task.state == 0 ? buttons[_task.state] : "" : ""}

                            ${isowner ? _task.state == 0 ? annulbtn : "" : ""}
                            ${isowner ? _task.state == 1 ? completebtn + unlocktask : "" : ""}
                        </div>
                    </div>
                </div>
    `
}

function renderTasks(tasks) {
    let notannuledtasks = tasks.filter(t => t.state != annuled)

    document.getElementById("tasks").innerHTML = ""
    notannuledtasks.forEach((_task) => {
        const newDiv = document.createElement("div")
        newDiv.className = "col-md-6"
        newDiv.innerHTML = taskTemplate(_task)
        document.getElementById("tasks").appendChild(newDiv)
    })
}


window.addEventListener("load", async () => {
    notification("⌛ Loading...")
    await connectMetaMaskWallet()
    // await getAllUsers();
    notification("Woohoo")
    // displayUserBalance()
    // notificationOff()
    // getTasks()
    // bridgeEvents(provider, user_address)


    const { name, chainId } = await provider.getNetwork()
    console.log(name)
    console.log(chainId)
    // console.log(identiconImg(user_address, 48))
    // console.log(identiconTemplate(user_address))

})

document.querySelector("#newTaskBtn").addEventListener("click", async (e) => {

    console.log("did i get in here")
    const childElems = document.getElementById("newTaskForm").elements
    let isValidArguements = true
    for (const child of childElems) {
        console.log(child.value)
        if (!child.value) isValidArguements = false
    };

    console.log("hmm", isValidArguements)


    if (isValidArguements) {

        let prize = document.getElementById("newTaskPrize").value
        prize = format_to_wei(prize)

        const params = [
            document.getElementById("newTaskDesc").value,
            document.getElementById("newProof").value,
            document.getElementById("contactinfo").value,
            prize,
            document.getElementById("lockDuration").value

        ]
        notification(`⌛ Adding your task...`)

        try {
            console.log(timely_tasksContractAddress)
            await erc20_contract.approve(timely_tasksContractAddress, prize, { gasPrice: 20e9 })
            await contract.addTask(temp_hash, ...params)
        }
        catch (error) {
            notification(`⚠️ An error occured ${error}.`)
        }
        notification(`🎉 You successfully added your task`)
        getTasks()
    }
    else notification(`Invalid inputs`)



})

// document.querySelector("#tasks").addEventListener("click", async (e) => {
//     // lock button
//     if (e.target.dataset.action == "lock") {
//         const index = e.target.id
//         notification("⌛ locking task, ")

//         try {
//             await erc20_contract.approve(timely_tasksContractAddress, tasks[index].lockcost, { gasPrice: 20e9 })

//             await contract
//                 .lockTask(index, { value: tasks[index].lockcost })

//             notification(`🎉 task ${ index } has been locked for ${ tasks[index].duration / 3600 } hours ".`)
//             getTasks()
//             getBalance()

//             await delay(4000)
//             notificationOff()
//         }
//         catch (error) {
//             notification(`${error}.`)
//         }
//     }

//     else if (e.target.dataset.action == "complete") {
//         const index = e.target.id
//         try {
//             await contract
//                 .completeTask(index)
//             notification(`🎉 You have certified task ${index} to have been completed.`)
//             getTasks()
//             getBalance()

//             await delay(4000)
//             notificationOff()
//         }
//         catch (error) {
//             notification(`${error}.`)
//         }
//     }

//     else if (e.target.dataset.action == "unlock") {
//         const index = e.target.id
//         // check for elapsed time period 
//         let timehaselapsed = tasks[index].startime + tasks[index].duration * 3600 <= Date.now() / 1000
//         if (!timehaselapsed) {
//             notification("Can not unlock yet, lock period has not yet elapsed")
//             return
//         }

//         try {
//             await contract.setBackToActive(index)

//             notification(`🎉 task ${index} has now been unlocked and some one else can pick up the bounty`)

//             getTasks()
//             getBalance()
//             await delay(4000)
//             notificationOff()

//         }
//         catch (error) {
//             notification(`${error}.`)
//         }
//     }

//     else if (e.target.dataset.action == "annul") {
//         const index = e.target.id
//         notification(`You are about to annul task ${index}. This action cannot be undone.`)

//         try {
//             await contract
//                 .annulTask(index)
//             notification(`task ${index} has been annuled.`)
//             getTasks()
//             getBalance()
//             await delay(4000)
//             notificationOff()
//         }
//         catch (error) {
//             notification(`${error}.`)
//         }

//     }
// })


