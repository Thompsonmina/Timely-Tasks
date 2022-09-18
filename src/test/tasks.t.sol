pragma solidity >=0.8.0;

import "forge-std/Test.sol";
import "forge-std/console2.sol";
import {ERC20} from "openzeppelin-contracts/token/ERC20/ERC20.sol";

import {Utilities} from "./utils/Utilities.sol";
// import {Vm} from "forge-std/Vm.sol";

import {Tasks} from "../tasks.sol";

contract DummyErc20 is ERC20 {
    constructor() ERC20("dummy", "DUM") {
        this;
    }

    function mint(address person, uint256 value) public {
        _mint(person, value);
    }
}

contract BaseSetup is Test {
    Utilities internal utils;

    address payable[] internal users;

    address internal contract_owner =
        0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84;
    address internal ada;
    address internal bob;
    string internal ada_nullifier;
    string internal bob_nullifier;

    Tasks internal task_contract;
    DummyErc20 internal bank;

    function setUp() public virtual {
        utils = new Utilities();
        users = utils.createUsers(5);

        ada = users[0];
        vm.label(ada, "Ada");
        bob = users[1];
        vm.label(bob, "Bob");

        ada_nullifier = "ada's nullifier";
        bob_nullifier = "bob's nullifier";

        bank = new DummyErc20();
        task_contract = new Tasks(address(bank), 1 hours);
    }
}

contract WorldcoinAssertions is BaseSetup {
    function setUp() public virtual override {
        BaseSetup.setUp();
    }

    function test_user_is_created_successfully() public {
        vm.prank(ada);
        task_contract.create_user(ada_nullifier, "ada");

        (address user_address, string memory username) = task_contract.users(
            ada_nullifier
        );

        assertEq(username, "ada");
        assertEq(user_address, ada);
    }

    function test_user_creation_fails_if_user_mapping_already_exists() public {
        vm.prank(ada);
        task_contract.create_user(ada_nullifier, "ada");

        vm.prank(bob);
        vm.expectRevert("hash is already associated with an address");
        task_contract.create_user(ada_nullifier, "bob");
    }

    function test_user_can_update_address(address new_ada_address) public {
        vm.prank(ada);
        task_contract.create_user(ada_nullifier, "ada");

        vm.prank(ada);
        task_contract.update_address(ada_nullifier, new_ada_address);

        (address user_address, string memory username) = task_contract.users(
            ada_nullifier
        );
        assertEq(user_address, new_ada_address);

        //ensure that the old address does still have access
        vm.prank(ada);
        vm.expectRevert("the address does not match the person");

        task_contract.update_address(ada_nullifier, new_ada_address);
    }

    function test_user_can_update_username(string memory new_username) public {
        vm.prank(ada);
        task_contract.create_user(ada_nullifier, "ada");

        vm.prank(ada);
        task_contract.update_username(ada_nullifier, new_username);

        (address user_address, string memory username) = task_contract.users(
            ada_nullifier
        );
        assertEq(username, new_username);
    }
}

contract TaskAssertions is BaseSetup {
    uint8 Active = 0;
    uint8 Locked = 1;
    uint8 Completed = 2;
    uint8 Annuled = 3;

    function setUp() public virtual override {
        BaseSetup.setUp();

        vm.prank(ada);
        task_contract.create_user(ada_nullifier, "ada");

        vm.prank(bob);
        task_contract.create_user(bob_nullifier, "bob");

        bank.mint(ada, 1 ether);
        bank.mint(bob, 1 ether);

        // vm.prank(ada);
        // bank.approve(contract_owner, 1 ether);

        vm.prank(bob);
        bank.approve(address(task_contract), 1 ether);

        //states
    }

    function add_a_task(
        string memory nullifier,
        uint256 payment_val,
        uint256 bounty_val,
        uint256 duration
    ) public {
        task_contract.addTask(
            nullifier,
            "task_description",
            "proof_description",
            "communications",
            bounty_val,
            duration
        );
    }

    function test_person_can_add_tasks() public {
        vm.prank(bob);

        console.log(bank.allowance(bob, address(task_contract)));
        // vm.prank(ada);

        console.log(task_contract.name(), address(task_contract));

        require(false, "me");

        uint256 prize = 100000;
        uint256 hrs = 3 hours;

        vm.prank(contract_owner);

        task_contract.ETH_ERC().transferFrom(ada, contract_owner, 1 ether);

        add_a_task(ada_nullifier, prize, prize, 3);

        (
            string memory creator_hash,
            string memory lock_owner_hash,
            string memory description,
            string memory proof_description,
            string memory communications,
            uint256 bounty,
            uint256 lockduration_in_hrs,
            ,
            uint256 lock_cost,
            uint8 task_state
        ) = task_contract.getTaskInfo(0);

        console.log("omo");
        assertEq(creator_hash, ada_nullifier);
        assertEq(lock_owner_hash, "");
        assertEq(description, "task_description");
        assertEq(proof_description, "proof_description");
        assertEq(communications, "communications");
        assertEq(bounty, prize);
        assertEq(lockduration_in_hrs, hrs);
        assertEq(lock_cost, (prize * task_contract.LockPercent()) / 100);
        assertEq(task_state, Active);

        // console.log(task_contract.getTaskInfo(1));
    }
}

//     function test_task_can_only_be_completed_if_it_has_been_locked() public {
//         vm.prank(ada);
//         add_a_task(4000, 4000, 3);

//         vm.expectRevert("only locked tasks can be completed");
//         vm.prank(ada);
//         task_contract.completeTask(0);
//     }

//     function test_bounty_hunters_can_lock_tasks() public {
//         vm.prank(ada);
//         add_a_task(10000, 10000, 3);
//         (, , , , , , , , uint256 lock_cost, ) = task_contract.getTaskInfo(0);

//         vm.prank(bob);
//         task_contract.lockTask{value: lock_cost}(0);

//         (, address lock_owner, , , , , , , , uint8 state) = task_contract
//             .getTaskInfo(0);
//         assertEq(lock_owner, bob);
//         assertEq(state, Locked);
//     }

//     function test_task_owners_cant_lock_thier_own_tasks() public {
//         vm.prank(ada);
//         add_a_task(10000, 10000, 3);
//         (, , , , , , , , uint256 lock_cost, ) = task_contract.getTaskInfo(0);

//         vm.expectRevert("the task owner does not have access");
//         vm.prank(ada);
//         task_contract.lockTask{value: lock_cost}(0);
//     }

//     function test_tasks_cant_be_locked_twice() public {
//         vm.prank(ada);
//         add_a_task(10000, 10000, 3);
//         (, , , , , , , , uint256 lock_cost, ) = task_contract.getTaskInfo(0);

//         vm.prank(bob);
//         task_contract.lockTask{value: lock_cost}(0);

//         address charlie = users[2];
//         vm.deal(charlie, 1 ether);

//         vm.expectRevert("The task has already been locked");
//         vm.prank(charlie);
//         task_contract.lockTask{value: lock_cost}(0);

//         vm.expectRevert("The task has already been locked");
//         vm.prank(bob);
//         task_contract.lockTask{value: lock_cost}(0);
//     }

//     // function test

//     function test_only_task_owners_can_complete_a_task() public {
//         vm.prank(ada);
//         add_a_task(4000, 4000, 3);

//         (, , , , , , , , uint256 lock_cost, ) = task_contract.getTaskInfo(0);

//         vm.prank(bob);
//         task_contract.lockTask{value: lock_cost}(0);

//         vm.expectRevert("only task owner have access");
//         vm.prank(bob);
//         task_contract.completeTask(0);
//     }

//     function test_owner_can_annul_task() public {
//         uint256 balance_before_bounty_payment = ada.balance;
//         vm.prank(ada);
//         add_a_task(4000, 4000, 3);

//         uint256 balance_after_bounty_payment = ada.balance;

//         vm.prank(ada);
//         task_contract.annulTask(0);

//         (, , , , , , , , , uint8 state) = task_contract.getTaskInfo(0);
//         assertEq(state, Annuled);

//         assertEq(
//             balance_after_bounty_payment + 4000,
//             balance_before_bounty_payment
//         );
//     }

//     function test_owner_cant_annul_a_locked_task() public {
//         vm.prank(ada);
//         add_a_task(4000, 4000, 3);

//         (, , , , , , , , uint256 lock_cost, ) = task_contract.getTaskInfo(0);

//         vm.prank(bob);
//         task_contract.lockTask{value: lock_cost}(0);

//         vm.expectRevert("The task has already been locked");
//         vm.prank(ada);
//         task_contract.annulTask(0);
//     }

//     function test_owner_cant_set_locked_task_to_expired() public {
//         vm.prank(ada);
//         uint256 lock_duration = 10;
//         add_a_task(4000, 4000, lock_duration);

//         (, , , , , , , , uint256 lock_cost, ) = task_contract.getTaskInfo(0);

//         vm.prank(bob);
//         task_contract.lockTask{value: lock_cost}(0);

//         // skip ahead but not so far ahead that lock duration has been exceeded
//         skip(4 hours);

//         vm.expectRevert("lock duration hasn't expired");
//         vm.prank(ada);
//         task_contract.setBackToActive(0);
//     }

//     function test_owner_can_set_expired_task_back_to_active() public {
//         vm.prank(ada);
//         uint256 lock_duration = 10;
//         add_a_task(4000, 4000, lock_duration);

//         (, , , , , , , , uint256 lock_cost, ) = task_contract.getTaskInfo(0);

//         vm.prank(bob);
//         task_contract.lockTask{value: lock_cost}(0);

//         // skip ahead but not so far ahead that lock duration has been exceeded
//         skip(12 hours);

//         vm.prank(ada);
//         task_contract.setBackToActive(0);

//         (
//             ,
//             address lock_owner,
//             ,
//             ,
//             ,
//             ,
//             ,
//             uint256 lock_start_time,
//             ,
//             uint8 state
//         ) = task_contract.getTaskInfo(0);

//         assertEq(lock_owner, address(0));
//         assertEq(state, Active);
//         assertEq(lock_start_time, 0);
//     }
// }

contract OtherAssertions is BaseSetup {
    function setUp() public virtual override {
        BaseSetup.setUp();
    }

    function test_actual_owner() public {
        assertEq(task_contract.owner(), contract_owner);
    }

    function test_onlyowner_can_modify_rate() public {
        task_contract.changeLockRate(25);
        assertEq(task_contract.LockPercent(), 25);

        vm.expectRevert("Address is not the owner");
        vm.prank(ada);
        task_contract.changeLockRate(34);
    }
}
