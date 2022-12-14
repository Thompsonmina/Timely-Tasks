// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface IERC20Token {
    function transfer(address, uint256) external returns (bool);

    function approve(address, uint256) external returns (bool);

    function transferFrom(
        address,
        address,
        uint256
    ) external returns (bool);

    function totalSupply() external view returns (uint256);

    function balanceOf(address) external view returns (uint256);

    function allowance(address, address) external view returns (uint256);

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );
}

/// @notice A cool new paradigm for publicy sourced tasks and bounties deployed on the skale chain.
/// @notice It uses worldcoin's proof of uniqueness for handling user management,
/// @author thompsonmina

contract Tasks {
    address public owner;
    address public ETH_ERCAddress = 0xD2Aaa00700000000000000000000000000000000;
    IERC20Token public ETH_ERC = IERC20Token(ETH_ERCAddress);

    uint256 public TasksLength = 0;
    uint16 public LockPercent = 10;

    // Task states
    uint8 internal Active = 0;
    uint8 internal Locked = 1;
    uint8 internal Completed = 2;
    uint8 internal Annuled = 3;

    uint256 timeunit = 1 seconds;

    struct Task {
        string creator_uniquehash;
        string lockowner_uniquehash;
        string taskDescription;
        string proofDescription;
        string communications;
        uint256 bounty;
        uint256 lockDurationInHours;
        uint256 lockStartTime;
        uint256 lockCost;
        uint8 state;
    }

    struct User {
        address payable user_address;
        string username;
    }

    // unique nullifier hash to a user mapping
    mapping(string => User) public users;

    string[] public nullifiers;

    // task id to task mapping
    mapping(uint256 => Task) internal tasks;

    // set owner when contract is deployed
    constructor(address etherc_address, uint256 _timeunit) {
        owner = msg.sender;
        ETH_ERCAddress = etherc_address;
        timeunit = _timeunit;
    }

    function stringIsEqual(string memory a, string memory b)
        internal
        pure
        returns (bool)
    {
        return keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b));
    }

    function getNullifiersLength() public view returns (uint256) {
        return nullifiers.length;
    }

    // Some self explanatory modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Address is not the owner");
        _;
    }

    modifier hashMatchesSender(string memory user_nullifier) {
        require(
            users[user_nullifier].user_address == msg.sender,
            "the address does not match the person"
        );
        _;
    }

    modifier onlyTaskOwner(uint256 _id, string memory user_nullifier) {
        require(
            stringIsEqual(tasks[_id].creator_uniquehash, user_nullifier),
            "only task owner have access"
        );
        _;
    }

    modifier notTaskOwner(uint256 _id, string memory user_nullifier) {
        require(
            !stringIsEqual(tasks[_id].creator_uniquehash, user_nullifier),
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

    function create_user(string memory user_nullifier, string memory username)
        external
    {
        // Associate a nullifier hash to an address and username
        require(
            users[user_nullifier].user_address == address(0),
            "hash is already associated with an address"
        );
        users[user_nullifier] = User(payable(msg.sender), username);
        nullifiers.push(user_nullifier);
    }

    function update_address(string memory user_nullifier, address new_address)
        external
        hashMatchesSender(user_nullifier)
    {
        // allow a user the option to associate a different address to herself
        users[user_nullifier].user_address = payable(new_address);
    }

    function update_username(
        string memory user_nullifier,
        string memory new_username
    ) external hashMatchesSender(user_nullifier) {
        // associate a different username to himself

        users[user_nullifier].username = new_username;
    }

    function lockTask(uint256 _id, string memory user_nullifier)
        external
        payable
        taskIsModifiable(_id)
        taskIsUnlocked(_id)
        hashMatchesSender(user_nullifier)
        notTaskOwner(_id, user_nullifier)
    {
        /* users that are not the owners of the tasks can lock tasks after paying for them */

        // pay for the lock first
        require(
            ETH_ERC.transferFrom(
                msg.sender,
                address(this),
                tasks[_id].lockCost
            ),
            "Lock cost was not transferred"
        );

        tasks[_id].state = Locked;
        tasks[_id].lockStartTime = block.timestamp;
        tasks[_id].lockowner_uniquehash = user_nullifier;
    }

    function setBackToActive(uint256 _id, string memory user_nullifier)
        external
        hashMatchesSender(user_nullifier)
        onlyTaskOwner(_id, user_nullifier)
        taskIsModifiable(_id)
    {
        /*A task is only set back to active if the owner of the task hasnt received any tangible results from the person
        working on the task or the task is not verifiable as completed per the proof and the lock duration has expired*/

        if (_lockHasExpired(_id)) {
            tasks[_id].state = Active;
            tasks[_id].lockStartTime = 0;
            tasks[_id].lockowner_uniquehash = "";
        } else revert("lock duration hasn't expired");
    }

    function completeTask(uint256 _id, string memory user_nullifier)
        external
        payable
        hashMatchesSender(user_nullifier)
        onlyTaskOwner(_id, user_nullifier)
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
        require(
            !stringIsEqual(
                tasks[_id].lockowner_uniquehash,
                "You can't complete a bounty that has no locker"
            )
        );

        tasks[_id].state = Completed;
        require(
            ETH_ERC.transfer(
                users[tasks[_id].lockowner_uniquehash].user_address,
                total
            ),
            "Could not disburse funds"
        );
    }

    function annulTask(uint256 _id, string memory user_nullifier)
        external
        payable
        hashMatchesSender(user_nullifier)
        onlyTaskOwner(_id, user_nullifier)
        taskIsModifiable(_id)
        taskIsUnlocked(_id)
    {
        /* A task owner can choose to withdraw tasks that have no takers*/

        // pay back bounty to the owner of the task

        require(
            ETH_ERC.transfer(
                users[tasks[_id].creator_uniquehash].user_address,
                tasks[_id].bounty
            ),
            "Could not disburse funds"
        );

        tasks[_id].state = Annuled;
    }

    function addTask(
        /* add a task to the contract the prize for the task has to be paid for by the onwer on creation*/
        string memory user_nullifier,
        string memory _taskDescription,
        string memory _proofDescription,
        string memory _communications,
        uint256 _bounty,
        uint256 _duration
    ) external payable hashMatchesSender(user_nullifier) {
        // guard agaisnt stupidly low bounties that break the arithmetic
        require(_bounty >= 10000, "Too low a bounty amount");

        require(
            ETH_ERC.transferFrom(
                payable(msg.sender),
                payable(address(this)),
                _bounty
            ),
            "Bounty price was not transferred or sufficient"
        );

        // require(false, "is it here");

        uint256 _lockcost = (_bounty * LockPercent) / 100;
        uint256 _lockstarttime = 0;
        _duration = _duration * timeunit;

        tasks[TasksLength] = Task(
            user_nullifier,
            "",
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
            string memory,
            string memory,
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
            task.creator_uniquehash,
            task.lockowner_uniquehash,
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

    function name() external view returns (address) {
        return address(this);
    }
}
