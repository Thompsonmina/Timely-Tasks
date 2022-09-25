import timely_tasks_artefacts from '../out/tasks.sol/Tasks.json'
import schain_abis from '../skale/schainAbis.json';
import { notification, notificationOff, format_to_wei, convertIterableToMap, delay } from "./utils";
import { bridgeEvents } from "./bridge_actions";


import { ethers } from "ethers";


const timely_tasks_Abi = timely_tasks_artefacts["abi"];
const erc20Abi = schain_abis.eth_erc20_abi;
const timely_tasksContractAddress = "0x3911BFCc12C5226Cf87eb21f1dD49e37F53Fbbc3";
const etherc20Address = schain_abis.eth_erc20_address;

let contract;
let erc20_contract;
let tasks = [];
let provider;
let current_address;
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


// mocking out the worldcoin widget action
const mockWorldId = document.querySelector("#mockWorldcheckbox")
if (mockWorldId) {
    mockWorldId.addEventListener("click", async (e) => {
        console.log("meow")
        let empty_proof = {
            "merkle_root": "",
            "nullifier_hash": "",
            "action_id": "",
            "signal": "",
            "proof": ""
        };
        onWorldcoinSuccess(empty_proof, true)
    })
}

// Fetch the nullifier hash using the response gotten from the world coin widget 
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

// 
async function onWorldcoinSuccess(proof, is_mock = false) {
    console.log(proof);

    let nullifier_hash;


    // if called in mock just set the user's address as the nullifier hash
    if (!is_mock) {
        nullifier_hash = await getVerifiedNullifierHash(proof);
    } else nullifier_hash = "sanwo"//current_address;


    // check if the nullifier hash we get from worldcoin has already been added to contract
    // signifying an already registered dapp user
    if (registered_users_hashes.includes(nullifier_hash)) {
        document.getElementById("user-dialogue-modal").innerHTML = userFlowTemplate(false);
        console.log("here");
        window.sessionStorage.setItem("user_hash", nullifier_hash);
        user_hash = nullifier_hash;

        // or create a new user by associating a username and address to the nullifier hash
    } else {
        document.getElementById("user-dialogue-modal").innerHTML = userFlowTemplate(true);
        document.querySelector("#createProfileBtn").addEventListener("click", async (e) => {

            let username = document.getElementById("username");
            console.log(user_hash, "hash")
            if (username.value != "" && user_hash == null) {
                try {
                    await contract.create_user(nullifier_hash, username.value);
                    window.sessionStorage.setItem("user_hash", nullifier_hash)
                    user_hash = nullifier_hash;

                    document.querySelector("#not-verified").style.display = "none"
                    document.querySelector("#verified").style.display = "block"
                    await getAllUsers();
                    notification("Your user profile has been successfully created")
                } catch (error) { await notification(`something went wrong: ${error}`) }

            } else {
                await notification("could not create user, username value should be given")
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

        await notification("⚠️ Please approve this DApp to use it.")
        try {
            provider = new ethers.providers.Web3Provider(
                window.ethereum,
                "any"
            );
            console.log("here?");
            await provider.send("eth_requestAccounts", []);
            let accounts = await provider.send("eth_requestAccounts", []);
            const signer = provider.getSigner();
            current_address = accounts[0]

            console.log(current_address);
            contract = new ethers.Contract(timely_tasksContractAddress, timely_tasks_Abi, signer);
            console.log("not here ayee")
            erc20_contract = new ethers.Contract(etherc20Address, erc20Abi, signer);
            console.log("new boss aye")
            console.log(contract)
            console.log(erc20_contract)
        }
        catch (error) {
            await notification(`⚠️ ${error}.`)
        }
    }
    else {
        await notification("⚠️ Please install Metamask.")
    }
}


const getEthBalance = async function (address) {
    let balance = await erc20_contract.balanceOf(address)
    balance = ethers.utils.formatEther(balance);
    return balance
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
    await notification("⌛ Loading...");
    await connectMetaMaskWallet();
    const { name, chainId } = await provider.getNetwork()


    if (chainId === 647426021) {
        await getAllUsers();
        console.log("huh?")
        const hashToUserMap = convertIterableToMap("user_hash", registered_users)
        user_hash = window.sessionStorage.getItem("user_hash");

        // debugger
        if (user_hash == null || !registered_users_hashes.includes(user_hash)) {
            user_hash = null;
            document.querySelector("#not-verified").style.display = "block";

        }
        // ensure that the address that is currently acitve on metamask is the one that is associated the world id
        else if (hashToUserMap[user_hash].address.toLowerCase() === current_address.toLowerCase()) {
            console.log(hashToUserMap[user_hash].address, current_address, "come on man")
            document.querySelector("#verified").style.display = "block";

        }
        else { await notification("The address active on metamask does not match the address that is assoicated to the world id", false) };

        // provider.on('accountsChanged', function (accounts) {
        //     current_address = accounts[0];
        //     console.log("providus")
        //     if (hashToUserMap[user_hash].address.toLowerCase() === current_address.toLowerCase())
        //         await notification("The address active on metamask does not match the address that is assoicated to the world id", false)
        // });

        // console.log(hashToUserMap[user_hash].address, current_address, "come on man")


        // fetch tasks
        getTasks();



    }
    else if (name === "rinkeby" && chainId === 4) { await notification("You are currently on the rinkeby test network", false) }
    else {
        await notification("Currently not on the supported schain, Dapp functionality will not work as expected", false)
    }
    console.log(chainId)
    console.log(name)

    //activate poppers
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl)
    })
})



document.querySelector("#bridge-actions").addEventListener("click", async (e) => {
    bridgeEvents(provider, current_address);
});

document.querySelector("#profile-btn").addEventListener("click", async (e) => {
    const usersMap = convertIterableToMap("user_hash", registered_users);
    console.log(usersMap, "users map")
    const ethBalance = await getEthBalance(current_address);
    document.getElementById("profile-content").innerHTML = profileTemplate(user_hash, usersMap, ethBalance);
    associateNewAddressFunctionality();

});

async function associateNewAddressFunctionality() {
    document.querySelector("#associateNewAddressBtn").addEventListener("click", async (e) => {
        console.log("got in here");
        let form = `
        <form id="">
        <div class="form-row">
            <div class="col">
                <input type="text" id="newAssociatedAddress" class="form-control mb-2"
                    placeholder="Enter the new address you want associate identity to" />
            </div>
        </div>
    </form>
    <button type="button" class="btn btn-danger" id="associateNewAddressSendBtn"> Associate New Adress</button>
    `
        let old_button = document.getElementById("associateNewAddressBtn")
        let the_parent = old_button.parentElement
        the_parent.innerHTML = form;
        document.querySelector("#associateNewAddressSendBtn").addEventListener("click", async (e) => {

            const new_address = document.getElementById("newAssociatedAddress")
            if (new_address.value && ethers.utils.isAddress(new_address.value)) {
                try {
                    if (user_hash != null) {
                        await contract.update_address(user_hash, new_address.value)
                        await notification(`🎉 You have successfully associated your identity to a new address, please switch over to the new account on metamask`)

                        await delay(2000);
                        the_parent.innerHTML = old_button

                    } else await notification("You have to be verified to perform this action")
                }
                catch (error) {
                    await notification(`⚠️ An error occured ${error}.`)
                }
            }
            else await notification("Invalid Address Inputed!!")

        });


    })
};

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
        await notification(`⌛ Adding your task...`)

        try {
            console.log(timely_tasksContractAddress)
            if (user_hash != null) {
                await erc20_contract.approve(timely_tasksContractAddress, prize, { gasPrice: 20e9 })
                await contract.addTask(user_hash, ...params)
                await notification(`🎉 You successfully added your task`)

            } else await notification("You have to be verified to perform this action")
        }
        catch (error) {
            await notification(`⚠️ An error occured ${error}.`)
        }
        getTasks()
    }
    else await notification(`Invalid inputs`)
})

// controls different task actions
document.querySelector("#tasks").addEventListener("click", async (e) => {
    // lock button
    if (user_hash == null) {
        await notification("you have to be verified to perform this action")
    }
    else {

        if (e.target.dataset.action == "lock") {
            const index = e.target.id
            await notification("⌛ locking task, ")

            try {
                await erc20_contract.approve(timely_tasksContractAddress, tasks[index].lockcost, { gasPrice: 20e9 })

                await contract
                    .lockTask(index, user_hash)

                await notification(`🎉 task ${index} has been locked for ${tasks[index].duration / 3600} hours ".`)
                getTasks()
            }
            catch (error) {
                await notification(`${error}.`)
            }
        }

        else if (e.target.dataset.action == "complete") {
            const index = e.target.id
            try {
                await contract
                    .completeTask(index, user_hash)
                await notification(`🎉 You have certified task ${index} to have been completed.`)
                getTasks()
            }
            catch (error) {
                await notification(`${error}.`)
            }
        }

        else if (e.target.dataset.action == "unlock") {
            const index = e.target.id
            // check for elapsed time period 
            console.log(tasks[index])
            let timehaselapsed = Number(tasks[index].startime) + Number(tasks[index].duration) <= Date.now() / 1000
            if (!timehaselapsed) {
                await notification("Can not unlock yet, lock period has not yet elapsed")
                return
            }

            try {
                await contract.setBackToActive(index, user_hash)

                await notification(`🎉 task ${index} has now been unlocked and some one else can pick up the bounty`)

                getTasks()
            }
            catch (error) {
                await notification(`${error}.`)
            }
        }

        else if (e.target.dataset.action == "annul") {
            // a task owner can choose to cancel / annul a task. As long it has not yet been locked
            const index = e.target.id
            await notification(`You are about to annul task ${index}. This action cannot be undone.`)

            try {
                await contract
                    .annulTask(index, user_hash)
                await notification(`task ${index} has been annuled.`)
                getTasks()
            }
            catch (error) {
                await notification(`${error}.`)
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

function identiconImg(alt, size = 48) {
    const icon = blockies
        .create({
            seed: alt,
            size: 8,
            scale: 16,
        })
        .toDataURL()

    return `<img src = "${icon}" width = "${size}" alt = "${alt}"> `
}

function identiconTemplate(_hash, hashToUserMap, size = 48) {
    return `
        <div class="rounded-circle overflow-hidden d-inline-block border border-white border-2 shadow-sm m-0 me-2">
            <a href="https://hackathon-complex-easy-naos.explorer.eth-online.skalenodes.com/address/${hashToUserMap[_hash].address}/transactions"
                target="_blank">
                ${identiconImg(_hash, size)}
            </a>
	  </div>
    `
}

function profileTemplate(_hash, hashToUserMap, eth_balance) {
    return `   <div class="modal-header">
                    <h4 class="modal-title">Profile</h4>
                </div>
                <div class="modal-body">
                    <div style="text-align:center;">
                        ${identiconTemplate(_hash, hashToUserMap, 140)}
                        <h3 class="media-heading">${hashToUserMap[user_hash].username}</h3>
                    </div>

                    <hr>
                    <div> <h6>Wrapped ETH balance: <span class="badge bg-secondary"> ${eth_balance} ETH</span></h6></div>
                    <div>
                    <button
                    type="button" class="btn btn-sm" id="associateNewAddressBtn" data-bs-toggle="tooltip" data-bs-placement="top" title="This permanently changes the 
                    address that your world id for thisi dapp is connected to, once changed you will no longer be able to use this address to perform transactions"> Associate a new address to identity
                    </button>
                    </div>
                    <br>
                </div>
                <div class="modal-footer">
                </div>
    `
}

function taskTemplate(_task, hashToUserMap) {
    console.log(hashToUserMap[_task.owner_hash].address)
    let buttons = []
    buttons[active] = `<a class="btn btn-outline-primary" data-action="lock" id = "${_task.index} data-bs-toggle="tooltip"
    data-bs-placement="top"
    title="This will lock the task up for the time duration specified, during this period no other tasker will be able to lock in the task
    You will have to stake a percentage of the bounty as part of the lock process">
        Lock in task for ${ethers.utils.formatEther(_task.lockcost)}  eth (10% of task prize)</a> `

    if (_task.state === locked) {
        buttons[locked] = `<a class="btn  btn-outline-danger .disabled" id = "${_task.index}">
        task locked by ${hashToUserMap[_task.locker_hash].username}</a> `
    }

    let completebtn = `<a class="btn  btn-outline-success .completeBtn" data-action="complete" id = "${_task.index} 
    data-bs-toggle="tooltip" data-bs-placement="top"
    title="Marking a task as complete means that the lock period has expired,  you are satisfied with the deliverable and are ready to the award tasker" >
        Mark as Completed</a> `
    let annulbtn = `<a class="btn  btn-outline-danger .annulBtn" data-action="annul" id = "${_task.index}" 
    data-bs-toggle="tooltip" data-bs-placement="top"
    title="Once a task has been annuled, it siezes to exist, the bounty you set on it will be returned back to you and no further actions can be performed on it" >
        Unlist Task</a> `
    let unlocktask = `<a class="btn  btn-outline-danger .unlockBtn" data-action="unlock" id = "${_task.index}" 
    data-bs-toggle="tooltip" data-bs-placement="top"
          title="Unlocking a task frees it to be taken up again by another tasker. You should only unlock a task if you are certain
          that the previous tasker did not perform according to the set requirements">
        Unlock Task</a> `

    let isowner = _task.owner_hash === user_hash
    return `
            <div class="card mb-4" style="border-radius: 0 !important;border: 1px solid black;box-shadow: 1px 1px 0px #0b0b0b; height: 450px;">
                <div class="card-body text-left p-4 position-relative">
                    ${identiconTemplate(_task.owner_hash, hashToUserMap)}
                    
                    <div class="overflow-auto" style="max-height:152px;>
                    <p class="card-text mb-4">
                    <h5 class="">Task Description</h5>

                        ${_task.taskdesc}
                        
                    </p>
                    <h5 class="card-title "> Expected Deliverables</h5>
                    <p class="">${_task.proof} </p>
                    </div>
                    <div class="pt-2">
                    <p> Task Prize: ${ethers.utils.formatEther(_task.prize)} eth <br>Contact Info: ${_task.contact}
                        <br>Lock Duration: ${_task.duration / 3600} hour(s)
                    </p>
                    </div>
                    
                        <div class="pb-1">
                            <br><span class="badge ${_task.state == 1 ? " bg-danger" : "bg-secondary"}">${turnStateToString(_task.state)}</span>
                            </div>
                        <div class="">
                            ${!isowner ? [0, 1].includes(_task.state) ? buttons[_task.state] : "" : ""}

                            ${isowner ? _task.state == 0 ? annulbtn : "" : ""}
                            ${isowner ? _task.state == 1 ? completebtn + unlocktask : "" : ""}
                        </div>
                    </div>
                </div>
    `
}
