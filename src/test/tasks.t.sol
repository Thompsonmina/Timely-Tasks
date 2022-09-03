pragma solidity >=0.8.0;

import {Test} from "forge-std/Test.sol";
import {Utilities} from "./utils/Utilities.sol";
import {console} from "./utils/Console.sol";
import {Vm} from "forge-std/Vm.sol";

import {Tasks} from "../tasks.sol";

contract BaseSetup is DSTest {
    Utilities internal utils;
    Vm internal immutable vm = Vm(HEVM_ADDRESS);

    address payable[] internal users;

    address internal owner = 0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84;
    address internal alice;
    address internal bob;

    Tasks internal task_contract;

    function setUp() public virtual {
        utils = new Utilities();
        users = utils.createUsers(5);

        alice = users[0];
        vm.label(alice, "Alice");
        bob = users[1];
        vm.label(bob, "Bob");

        task_contract = new Tasks();
    }
}

contract OtherAssertions is BaseSetup {
    function setUp() public virtual override {
        BaseSetup.setUp();
        console.log("set up is setting up");
    }

    function test_meh() public {
        assertEq(task_contract.owner, owner);
        console.log(HEVM_ADDRESS);
    }
}
