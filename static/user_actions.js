
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


export async function onWorldcoinSuccess(proof, registered_hashes, is_mock = true) {
    console.log(proof);


    let nullifier_hash;

    nullifier_hash = await getVerifiedNullifierHash(proof);

    window.localStorage.setItem("user_hash", nullifier_hash)


    if (registered_hashes.includes(nullifier_hash)) {
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
