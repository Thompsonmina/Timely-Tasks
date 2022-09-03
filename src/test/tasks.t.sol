pragma solidity >=0.8.0;

import "forge-std/Test.sol";
import "forge-std/console2.sol";

import {Utilities} from "./utils/Utilities.sol";
// import {Vm} from "forge-std/Vm.sol";

import {Tasks} from "../tasks.sol";

contract BaseSetup is Test {
    Utilities internal utils;

    address payable[] internal users;

    address internal contract_owner =
        0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84;
    address internal ada;
    address internal bob;

    Tasks internal task_contract;

    function setUp() public virtual {
        utils = new Utilities();
        users = utils.createUsers(5);

        ada = users[0];
        vm.label(ada, "Ada");
        bob = users[1];
        vm.label(bob, "Bob");

        task_contract = new Tasks();
    }
}

contract TaskOwnerAssertions is BaseSetup {
    uint8 Active = 0;
    uint8 Locked = 1;
    uint8 Completed = 2;
    uint8 Annuled = 3;

    function setUp() public virtual override {
        BaseSetup.setUp();
        vm.deal(ada, 1 ether);
        vm.deal(bob, 1 ether);

        //states
    }

    function add_a_task(
        uint256 payment_val,
        uint256 bounty_val,
        uint256 duration
    ) public {
        task_contract.addTask{value: payment_val}(
            "task_description",
            "proof_description",
            "communications",
            bounty_val,
            duration
        );
    }

    function test_person_can_add_tasks() public {
        vm.prank(ada);
        add_a_task(4000, 4000, 3);

        (
            address payable creator,
            address payable lock_owner,
            string memory description,
            string memory proof_description,
            string memory communications,
            uint256 bounty,
            uint256 lockduration_in_hrs,
            ,
            uint256 lock_cost,
            uint8 task_state
        ) = task_contract.getTaskInfo(0);

        assertEq(creator, ada);
        assertEq(lock_owner, address(0));
        assertEq(description, "task_description");
        assertEq(proof_description, "proof_description");
        assertEq(communications, "communications");
        assertEq(bounty, 4000);
        assertEq(lockduration_in_hrs, 3 hours);
        assertEq(lock_cost, (4000 * task_contract.LockPercent()) / 100);
        assertEq(task_state, Active);

        // console.log(task_contract.getTaskInfo(1));
    }

    function test_task_can_only_be_completed_if_it_has_been_locked() public {
        vm.prank(ada);
        add_a_task(4000, 4000, 3);

        vm.expectRevert("only locked tasks can be completed");
        vm.prank(ada);
        task_contract.completeTask(0);
    }

    function test_bounty_hunters_can_lock_tasks() public {
        vm.prank(ada);
        add_a_task(10000, 10000, 3);
        (, , , , , , , , uint256 lock_cost, ) = task_contract.getTaskInfo(0);

        vm.prank(bob);
        task_contract.lockTask{value: lock_cost}(0);

        (, address lock_owner, , , , , , , , uint8 state) = task_contract
            .getTaskInfo(0);
        assertEq(lock_owner, bob);
        assertEq(state, Locked);
    }

    function test_task_owners_cant_lock_thier_own_tasks() public {
        vm.prank(ada);
        add_a_task(10000, 10000, 3);
        (, , , , , , , , uint256 lock_cost, ) = task_contract.getTaskInfo(0);

        vm.expectRevert("the task owner does not have access");
        vm.prank(ada);
        task_contract.lockTask{value: lock_cost}(0);
    }

    function test_tasks_cant_be_locked_twice() public {
        vm.prank(ada);
        add_a_task(10000, 10000, 3);
        (, , , , , , , , uint256 lock_cost, ) = task_contract.getTaskInfo(0);

        vm.prank(bob);
        task_contract.lockTask{value: lock_cost}(0);

        address charlie = users[2];
        vm.deal(charlie, 1 ether);

        vm.expectRevert("The task has already been locked");
        vm.prank(charlie);
        task_contract.lockTask{value: lock_cost}(0);

        vm.expectRevert("The task has already been locked");
        vm.prank(bob);
        task_contract.lockTask{value: lock_cost}(0);
    }

    // function test

    function test_only_task_owners_can_complete_a_task() public {
        vm.prank(ada);
        add_a_task(4000, 4000, 3);

        (, , , , , , , , uint256 lock_cost, ) = task_contract.getTaskInfo(0);

        vm.prank(bob);
        task_contract.lockTask{value: lock_cost}(0);

        vm.expectRevert("only task owner have access");
        vm.prank(bob);
        task_contract.completeTask(0);
    }
}

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
