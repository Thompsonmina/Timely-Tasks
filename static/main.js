import timely_tasks_artefacts from '../out/tasks.sol/Tasks.json'
import schain_abis from '../skale/schainAbis.json';
import { notification, notificationOff, format_to_wei, convertIterableToMap } from "./utils";
import { bridgeEvents } from "./bridge_actions";


import { ethers } from "ethers";


const timely_tasks_Abi = timely_tasks_artefacts["abi"];
const erc20Abi = schain_abis.eth_erc20_abi;
const timely_tasksContractAddress = "0x70c91018bA7551b313684Ae2111634014f1eE083";
const etherc20Address = schain_abis.eth_erc20_address;

let contract;
let erc20_contract;
let tasks = [];
let provider;
let user_address;
let user_hash = null;
let registered_users_hashes = [];
let registered_users = []

const signal = "timely tasks";
const action_id = "wid_staging_0906d5a67796091e7b2b07767ab54dfd";

const active = 0;
const locked = 1;
const complete = 2;
const annuled = 3;


worldID.init("world-id-container", {
    enable_telemetry: true,
    action_id: action_id,
    signal: signal,
    on_success: (proof) => onWorldcoinSuccess(proof)
});


const mockWorldId = document.querySelector("#mockWorldcheckbox")
if (mockWorldId) {
    mockWorldId.addEventListener("click", async (e) => {
        console.log("meow")
        onWorldcoinSuccess({
            "merkle_root": "0x1f38b57f3bdf96f05ea62fa68814871bf0ca8ce4dbe073d8497d5a6b0a53e5e0",
            "nullifier_hash": "0x0339861e70a9bdb6b01a88c7534a3332db915d3d06511b79a5724221a6958fbe",
            "action_id": "wid_staging_0906d5a67796091e7b2b07767ab54dfd",
            "signal": "your_signal_here",
            "proof": "0x063942fd7ea1616f17787d2e3374c1826ebcd2d41d2394d915098c73482fa59516145cee11d59158b4012a463f487725cb3331bf90a0472e17385832eeaec7a713164055fc43cc0f873d76752de0e35cc653346ec42232649d40f5b8ded28f202793c4e8d096493dc34b02ce4252785df207c2b76673924502ab56b7e844baf621025148173fc74682213753493e8c90e5c224fc43786fcd09b624115bee824618e57bd28caa301f6b21606e7dce789090de053e641bce2ce0999b64cdfdfb0a0734413914c21e4e858bf38085310d47cd4cc6570ed634faa2246728ad64c49f1f720a39530d82e1fae1532bd7ad389978b6f337fcd6fa6381869637596e63a1"
        }, true)
    })
}

async function getVerifiedNullifierHash(proof) {
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
                console.log(response);
                throw new Error('Network response was not OK');
            }
            return response.json();
        })
        .then((data) => nullifier_hash = data.nullifier_hash)
        .catch((err) => console.log(err));

    return nullifier_hash;
}

async function onWorldcoinSuccess(proof, is_mock = false) {
    console.log(proof);

    let nullifier_hash;

    // var modal = new bootstrap.Modal(document.getElementById('userFlowModal'), {
    // })
    // modal.hide();

    // if called in mock just set the user's address as the nullifier hash
    if (!is_mock) {
        nullifier_hash = await getVerifiedNullifierHash(proof);
    } else nullifier_hash = user_address;


    // check if the nullifier hash we get from worldcoin has already been added to contract
    // signifying an already registered dapp user
    if (registered_users_hashes.includes(nullifier_hash)) {
        document.getElementById("user-dialogue-modal").innerHTML = userFlowTemplate(false);
        console.log("here");
        window.sessionStorage.setItem("user_hash", nullifier_hash);
        user_hash = nullifier_hash;

        // or create a new user by associating a username and address to the nullifier hash
    } else {
        console.log("here new")
        document.getElementById("user-dialogue-modal").innerHTML = userFlowTemplate(true);
        document.querySelector("#createProfileBtn").addEventListener("click", async (e) => {
            let username = document.getElementById("username");
            console.log(user_hash, "hash")
            if (username.value != "" && user_hash == null) {
                try {
                    await contract.create_user(nullifier_hash, username.value);
                    console.log(username.value)
                    window.sessionStorage.setItem("user_hash", nullifier_hash)
                    console.log("here? create")
                    user_hash = nullifier_hash;
                    document.querySelector("#not-verified").style.display = "none"
                    document.querySelector("#verified").style.display = "block"


                } catch (error) { notification(`something went wrong: ${error}`) }

            } else {
                notification("could not create user, username value should be given")
            }
        })
    }

}

const getAllUsers = async function () {
    await getUsersHashes();
    console.log("got past here? hashes")

    const _users = [];

    for (let i = 0; i < registered_users_hashes.length; i++) {
        let _user = new Promise(async (resolve, reject) => {
            let p = await contract.users(registered_users_hashes[i])
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

// get all the distinct nullifier hashes of a user
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
                owner_hash: p[0],
                locker_hash: p[1],
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

function turnStateToString(stateint) {
    if (stateint == active) return "active"
    else if (stateint == annuled) return "annuled"
    else if (stateint == complete) return "completed"
    else if (stateint == locked) return "locked"
}

function renderTasks(tasks) {
    let notannuledtasks = tasks.filter(t => t.state != annuled)

    document.getElementById("tasks").innerHTML = ""
    const usersMap = convertIterableToMap("user_hash", registered_users)
    notannuledtasks.forEach((_task) => {
        console.log
        const newDiv = document.createElement("div")
        newDiv.className = "col-md-6"
        newDiv.innerHTML = taskTemplate(_task, usersMap)
        document.getElementById("tasks").appendChild(newDiv)
    })
}

window.addEventListener("load", async () => {
    notification("⌛ Loading...");
    await connectMetaMaskWallet();
    await getAllUsers();
    user_hash = window.sessionStorage.getItem("user_hash");
    if (user_hash == null || !registered_users_hashes.includes(user_hash)) {
        user_hash = null;
        document.querySelector("#not-verified").style.display = "block";

    } else {
        document.querySelector("#verified").style.display = "block";


    }

    console.log(registered_users_hashes)
    console.log(convertIterableToMap("user_hash", registered_users))
    getTasks();

    notification("Woohoo");

    const { name, chainId } = await provider.getNetwork()
    console.log(name)
    console.log(chainId)
    // console.log(identiconImg(user_address, 48))
    // console.log(identiconTemplate(user_address))

})

document.querySelector("#bridge-actions").addEventListener("click", async (e) => {
    bridgeEvents(provider, user_address);
});


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
            if (user_hash != null) {
                await erc20_contract.approve(timely_tasksContractAddress, prize, { gasPrice: 20e9 })
                await contract.addTask(user_hash, ...params)
                notification(`🎉 You successfully added your task`)

            } else notification("You have to be verified to perform this action")
        }
        catch (error) {
            notification(`⚠️ An error occured ${error}.`)
        }
        getTasks()
    }
    else notification(`Invalid inputs`)
})

document.querySelector("#tasks").addEventListener("click", async (e) => {
    // lock button
    if (user_hash == null) {
        notification("you have to be verified to perform this action")
    }
    else {

        if (e.target.dataset.action == "lock") {
            const index = e.target.id
            notification("⌛ locking task, ")

            try {
                await erc20_contract.approve(timely_tasksContractAddress, tasks[index].lockcost, { gasPrice: 20e9 })

                await contract
                    .lockTask(index, user_hash)

                notification(`🎉 task ${index} has been locked for ${tasks[index].duration / 3600} hours ".`)
                getTasks()
            }
            catch (error) {
                notification(`${error}.`)
            }
        }

        else if (e.target.dataset.action == "complete") {
            const index = e.target.id
            try {
                await contract
                    .completeTask(index, user_hash)
                notification(`🎉 You have certified task ${index} to have been completed.`)
                getTasks()
            }
            catch (error) {
                notification(`${error}.`)
            }
        }

        else if (e.target.dataset.action == "unlock") {
            const index = e.target.id
            // check for elapsed time period 
            console.log(tasks[index])
            let timehaselapsed = Number(tasks[index].startime) + Number(tasks[index].duration) <= Date.now() / 1000
            if (!timehaselapsed) {
                notification("Can not unlock yet, lock period has not yet elapsed")
                return
            }

            try {
                await contract.setBackToActive(index, user_hash)

                notification(`🎉 task ${index} has now been unlocked and some one else can pick up the bounty`)

                getTasks()
            }
            catch (error) {
                notification(`${error}.`)
            }
        }

        else if (e.target.dataset.action == "annul") {
            // a task owner can choose to cancel / annul a task. As long it has not yet been locked
            const index = e.target.id
            notification(`You are about to annul task ${index}. This action cannot be undone.`)

            try {
                await contract
                    .annulTask(index, user_hash)
                notification(`task ${index} has been annuled.`)
                getTasks()
            }
            catch (error) {
                notification(`${error}.`)
            }
        }
    }
})



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
                    <button type="button" class="btn btn-outline-primary" ${is_new ? 'id="createProfileBtn">Create Profile' : 'data-dismiss="modal">Log in'} </button>
                </div>
                `

}

function identiconImg(_address, size = 48) {
    const icon = blockies
        .create({
            seed: _address,
            size: 8,
            scale: 16,
        })
        .toDataURL()

    return `<img src = "${icon}" width = "${size}" alt = "${_address}"> `
}

function identiconTemplate(_hash, hashToUserMap) {
    return `
        <div class="rounded-circle overflow-hidden d-inline-block border border-white border-2 shadow-sm m-0">
            <a href="https://hackathon-complex-easy-naos.explorer.eth-online.skalenodes.com/address/${hashToUserMap[_hash].address}/transactions"
                target="_blank">
                ${identiconImg(_hash)}
            </a>
	  </div>
        `
}

function taskTemplate(_task, hashToUserMap) {
    console.log(hashToUserMap[_task.owner_hash].address)
    let buttons = []
    buttons[active] = `<a class="btn btn-outline-primary" data-action="lock" id = "${_task.index}">
        Lock in task for ${ethers.utils.formatEther(_task.lockcost)}  eth (10% of task prize)</a> `
    buttons[locked] = `<a class="btn  btn-outline-danger .disabled" id = "${_task.index}">
        task locked by ${identiconImg(_task.locker_hash, 24)}</a> `
    let completebtn = `<a class="btn  btn-outline-success .completeBtn" data-action="complete" id = "${_task.index}" >
        Mark as Completed</a> `
    let annulbtn = `<a class="btn  btn-outline-danger .annulBtn" data-action="annul" id = "${_task.index}" >
        Unlist Task</a> `
    let unlocktask = `<a class="btn  btn-outline-danger .unlockBtn" data-action="unlock" id = "${_task.index}" >
        Unlock Task</a> `

    let isowner = _task.owner_hash === user_hash
    return `
            <div class="card mb-4" style="border-radius: 0 !important;border: 1px solid black;box-shadow: 1px 1px 0px #0b0b0b; height: 450px;" >
                <div class="card-body text-left p-4 position-relative">
                    <!-- <div class="translate-middle-y position-absolute top-0"> -->
                    ${identiconTemplate(_task.owner_hash, hashToUserMap)}
                        <!-- </div> -->
                    <h5 class="card-title">Task Description</h5>
                    <p class="card-text mb-4">
                        ${_task.taskdesc}
                    </p>
                    <h5 class="card-title "> Expected Deliverables</h5>
                    <p class="mb-4">${_task.proof} </p>
                    <p> Task Prize: ${ethers.utils.formatEther(_task.prize)} eth <br>Contact Info: ${_task.contact}
                        <br>Lock Duration: ${_task.duration / 3600} hour(s)
                        <br>
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
