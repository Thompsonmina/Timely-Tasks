# Timely tasks (ETHOnline 2022 Hackathon Prize Winner)
Timely tasks is a decentralized application built on the the skale blockchain written with solidity. The basic idea of the DApp is to be a place where people can post verifiable tasks that other people can complete permissionlessly in order to get a bounty. It achieves this idea in a novel way by using time locks

## Why Timely Tasks ?
Most bounty / freelance platforms,  are rife with unhealthy competition. I have seen some examples where multiple people rush to complete the same bounty or task, where only one will be chosen. which leads to wasted effort for the other possibly qualified people that were also working on the task. With Timely tasks once a task has been locked by one person other people will know not to waste effort trying to work on that task while it is still locked. Also because to be able to lock a task you have to stake a small percentage of the bounty, tasks self select for expertise. Only people that are reasonably sure that they will be able to complete the task within the time frame provided will want to lock that task.

Timely tasks also helps to solve against discrimination, Task creators do not have to be privy to the details of the person doing the task, they do not even get to select who will work on thier task but they are still reasonable certain that thier task once locked by someone else will get done.

## How it Works
We have two types of actors that can use the dapp, task creators and task executioners. 

### Task Creators
These users come on the platform and post verifiable bounties, In order to post a task they would have to submit relavant details about the task, such as  what it is, what someone has to do to show that the task has been completed, how much bounty is attached to the task, a communications channel where a prospective task complete can use to communicate to the task owner and for how long a task gets to be locked for. On Task Creation the task bounty is also paid directly into the contract. Currently The task creator decides whether a task (after the lock has expired) has been completed by evaluating against the verification guidelines that have been set.

A Task Creator can also unlock a task if they do not hear from or see any progress on task and the lock duration set has expired. In which case the defaulting task Executioner loses their lock stake. A task owner may also choose to withdraw / unlist any task that isn't yet locked in which case they are paid back thier bounty amount.


### Task Executioners
A task Executioner can choose to lock in a task, if she/he feels they have the competence and time to complete it. The act of locking in a task means that for the duration of the lock you you have no competition for that specific task, the task is yours to complete. In order for this mechanism to not be exploited and to ensure only suitable people get to work on the task. To lock a task a you must stake a certain amount of ether which is a percentage of the bounty, after you have successfully completed the task, you get both the full bounty plus your stake back.

## Deployed Contract
https://hackathon-complex-easy-naos.explorer.eth-online.skalenodes.com/address/0x75aa1FF9594603C0c94CA1c0b35A99B54eF0E0f0/transactions


### Sponsors
- Skale
- Worldcoin
- Valist

## Worldcoin
Users of timely tasks are pseudonysous but it is important to ensure that each user is an actually real person. Thanks to worldcoin i was able to guarantee this. And not only that, but by tying a user's identity to thier worldcoin identity rather than just thier address. Timely tasks is address agnostic. Meaning a user can choose what address they use to make transactions with and can change that address as needed.

### Depth of integration:
I integrated the frontend widget as well as used cloud verification with my smart contract serving as the backend. The flow goes like this, A new user has to verify thier identity in order to create thier account, upon account creation the user's unique nullifier hash is associated to that specific user's details (username, address)  via a mapping in my smart contract and the hash is also stored in a session on the frontend. The nullifier hash in combination with thier address is then what is used as a users identifier for every interaction on the smart contract that requires an action from a unique person. 
Worldcoin id also serves as the dapp's method of authentication as already created users can log back into the platform by just verifying thier humanity again. Since its always going to be the same nullifier id for the same action id.

#### Note
Due to the flakiness of the worldcoin test simulator, i had to mock the portion of the interaction that gets the proof from the widget and fetchs the actual nullifier hash. So for the purpose of the demonstration i will be manually assigning the nullifier hash to be the address of caller. The main change is in the function `onWorldcoinSuccess` in static/main.js. I added a conditional bypass that sets the nullifier hash to the address, instead of fetching from worldcoin.


## Skale 
My smart contract is deployed on and leverages the skale network for scalabity and zero gas costs.

### Depth of integration
My smart contract is deployed on https://eth-online.skalenodes.com/v1/hackathon-complex-easy-naos. I also integrated the Ethereum <> SKALE IMA Bridge operations on my dapp to allow users easily bridge transfer thier eth from ethereum to skale and vice versa. That way task creators can transfer over eth from ethereum that they can put as bounties for thier tasks and task executors can freely transfer back thier claimed bounties to ethereum.

## Valist
My project is published and built on valist. You can check out my project page here: [timely-tasks] (https://app.valist.io/thompson/timely-tasks)
and you can also play around with the latest release of the dapp itself: https://gateway.valist.io/ipfs/bafybeifom325skqvz7uoyit5mnlssi5looug5fgk224umpwthwchrqmapm


## Future Improvements
1. Intergrating  a native communications channel in app that allows both parties to communicate with each other.
2. Allow a task executor to be able to challenge a task solution that was declined (The task owner unlocked the task after completion instead of marking it as completed)
3. Possibly a Timely Tasks DAO that might exist to resolve conflicts btw a task owner and task executor.
4. (Ambitious) Delegate the verifcation of the bounty to another party that is not the Task creator to remove the possiblity of foul play. For example maybe incorporate zk-proofs so that a task owner may verify that a task was successfully completed without the task executor having to hand over the result until the task owner has marked the task as completed. Or even have the task verified by an external oracle/3rd party.

