// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

interface IVerifier {
    function verifyProof(bytes memory _proof, uint256[2] memory _input) external returns (bool);
}