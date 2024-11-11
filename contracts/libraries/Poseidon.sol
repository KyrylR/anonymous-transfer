// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

// solhint-disable

library PoseidonUnit1L {
    function poseidon(bytes32[1] calldata) public pure returns (bytes32) {}
}

library PoseidonUnit2L {
    function poseidon(bytes32[2] calldata) public pure returns (bytes32) {}
}

library PoseidonUnit3L {
    function poseidon(bytes32[3] calldata) public pure returns (bytes32) {}
}
