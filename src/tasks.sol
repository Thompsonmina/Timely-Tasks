// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0;

contract Tasks {
    address public owner;

    // intial values
    uint256 public TasksLength = 0;
    uint16 public LockPercent = 15;

    // define task states
    uint8 internal Active = 0;
    uint8 internal Locked = 1;
    uint8 internal Completed = 2;
    uint8 internal Annuled = 3;

    struct Task {
        address payable creator;
        address payable lockOwner;
        string taskDescription;
        string proofDescription;
        string communications;
        uint256 bounty;
        uint256 lockDurationInHours;
        uint256 lockStartTime;
        uint256 lockCost;
        uint8 state;
    }

    mapping(uint256 => Task) internal tasks;

    // set owner when contract is deployed
    constructor() {
        owner = msg.sender;
    }

    // Some self explanatory modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Address is not the owner");
        _;
    }
    modifier onlyTaskOwner(uint256 _id) {
        require(
            tasks[_id].creator == msg.sender,
            "only task owner have access"
        );
        _;
    }

    modifier notTaskOwner(uint256 _id) {
        require(
            tasks[_id].creator != msg.sender,
            "the task owner does not have access"
        );
        _;
    }

    modifier taskIsModifiable(uint256 _id) {
        require(tasks[_id].state != Completed || tasks[_id].state != Annuled);
        _;
    }

    modifier taskIsUnlocked(uint256 _id) {
        require(tasks[_id].state == Active, "The task has already been locked");
        _;
    }

    function _lockHasExpired(uint256 _id) private view returns (bool) {
        /* checks whether the lock time has elapsed*/
        require(tasks[_id].state == Locked, "lock has not expired");
        return ((tasks[_id].lockStartTime + tasks[_id].lockDurationInHours) <=
            block.timestamp);
    }

    function lockTask(uint256 _id)
        external
        payable
        taskIsModifiable(_id)
        taskIsUnlocked(_id)
        notTaskOwner(_id)
    {
        /* users that are not the owners of the tasks can lock tasks after paying for them */

        // pay for the lock first
        require(
            msg.value == tasks[_id].lockCost,
            "Lock cost was not transferred"
        );

        tasks[_id].state = Locked;
        tasks[_id].lockStartTime = block.timestamp;
        tasks[_id].lockOwner = payable(msg.sender);
    }

    function setBackToActive(uint256 _id)
        external
        onlyTaskOwner(_id)
        taskIsModifiable(_id)
    {
        /*A task is only set back to active if the owner of the task hasnt received any tangible results from the person
        working on the task or the task is not verifiable as completed per the proof and the lock duration has expired*/

        if (_lockHasExpired(_id)) {
            tasks[_id].state = Active;
            tasks[_id].lockStartTime = 0;
            tasks[_id].lockOwner = payable(address(0));
        } else revert("lock duration hasn't expired");
    }

    function completeTask(uint256 _id)
        external
        payable
        onlyTaskOwner(_id)
        taskIsModifiable(_id)
    {
        /* pay the account that locked the task for successful completion including lock money
            only locked tasks can be completed
        */
        require(
            tasks[_id].state == Locked,
            "only locked tasks can be completed"
        );
        uint256 total = tasks[_id].bounty + tasks[_id].lockCost;

        // Pay the locked guy and emit an event
        require(tasks[_id].lockOwner != address(0));

        (bool sent, bytes memory data) = tasks[_id].lockOwner.call{
            value: total
        }("");
        require(sent, "Could not disburse funds");

        tasks[_id].state = Completed;
    }

    function annulTask(uint256 _id)
        external
        payable
        onlyTaskOwner(_id)
        taskIsModifiable(_id)
        taskIsUnlocked(_id)
    {
        /* A task owner can choose to withdraw tasks that have no takers*/

        // pay back bounty to the owner of the task

        (bool sent, bytes memory data) = tasks[_id].creator.call{
            value: tasks[_id].bounty
        }("");
        require(sent, "Could not disburse funds");
        tasks[_id].state = Annuled;
    }

    function addTask(
        /* add a task to the contract the prize for the task has to be paid for by the onwer on creation*/
        string memory _taskDescription,
        string memory _proofDescription,
        string memory _communications,
        uint256 _bounty,
        uint256 _duration
    ) external payable {
        // guard agaisnt stupidly low bounties
        require(_bounty >= 2000, "Too low a bounty amount");

        require(
            msg.value == _bounty,
            "Bounty price was not transferred or sufficient"
        );

        uint256 _lockcost = (_bounty * LockPercent) / 100;
        uint256 _lockstarttime = 0;
        _duration = _duration * 1 hours;

        tasks[TasksLength] = Task(
            payable(msg.sender),
            payable(address(0)),
            _taskDescription,
            _proofDescription,
            _communications,
            _bounty,
            _duration,
            _lockstarttime,
            _lockcost,
            Active
        );
        TasksLength++;
    }

    function getTaskInfo(uint256 _id)
        external
        view
        returns (
            /* get the important information about a task*/
            address payable,
            address payable,
            string memory,
            string memory,
            string memory,
            uint256,
            uint256,
            uint256,
            uint256,
            uint8
        )
    {
        Task storage task = tasks[_id];
        return (
            task.creator,
            task.lockOwner,
            task.taskDescription,
            task.proofDescription,
            task.communications,
            task.bounty,
            task.lockDurationInHours,
            task.lockStartTime,
            task.lockCost,
            task.state
        );
    }

    function changeLockRate(uint16 percent) external onlyOwner {
        /*allows the owner of the contract to modify the lock rate */
        require(
            percent <= 50,
            "taskers shouldnt have to lock more 50 percent of bounty"
        );
        LockPercent = percent;
    }
}
