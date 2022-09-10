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

const getTasks = async function () {
    let _taskslength = await contract.TasksLength()
    _taskslength = ethers.BigNumber.from(_taskslength).toNumber()
    console.log(_taskslength)
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

    return `<img src="${icon}" width="${size}" alt="${_address}">`
}


function identiconTemplate(_address) {
    return `
	  <div class="rounded-circle overflow-hidden d-inline-block border border-white border-2 shadow-sm m-0">
	    <a href="https://hackathon-complex-easy-naos.explorer.eth-online.skalenodes.com/address/${_address}/transactions"
	        target="_blank">
	        ${identiconImg(_address)}
	    </a>
	  </div>
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
    buttons[active] = `<a class="btn  btn-primary" data-action="lock" id="${_task.index}">
                    Lock in task for ${ethers.BigNumber.from(_task.lockcost)} eth</a>`
    buttons[locked] = `<a class="btn  btn-danger .disabled" id="${_task.index}">
            task locked by ${identiconImg(_task.locker, 24)}</a>`
    let completebtn = `<a class="btn  btn-success .completeBtn" data-action="complete" id="${_task.index}">
              Mark as Completed</a>`
    let annulbtn = `<a class="btn  btn-danger .annulBtn" data-action="annul" id="${_task.index}">
            Unlist Task</a>`
    let unlocktask = `<a class="btn  btn-danger .unlockBtn" data-action="unlock" id="${_task.index}">
            Unlock Task</a>`

    let isowner = _task.owner === user_address
    return `
    <div class="card mb-4">
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
        <p> Task Prize: ${ethers.BigNumber.from(_task.prize)} eth <br>Contact Info: ${_task.contact} 
        <br>Lock Duration: ${_task.duration / 3600} hour(s)
        <br><span class="badge ${_task.state == 1 ? "bg-danger" : "bg-secondary"}">${turnStateToString(_task.state)}</span>
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
    displayUserBalance()
    notificationOff()
    getTasks()
    console.log(identiconImg(user_address, 48))
    console.log(identiconTemplate(user_address))

})
