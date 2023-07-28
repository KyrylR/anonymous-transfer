// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {IVerifier} from "./interfaces/IVerifier.sol";

import {PoseidonIMT} from "./utils/PoseidonIMT.sol";

contract Depositor is PoseidonIMT {
    IVerifier public verifier;

    mapping(bytes32 => bool) public commitments;
    mapping(bytes32 => bool) public nullifies;

    /**
     * @notice Depositor contract constructor
     *
     * @param treeHeight_ Incremental Merkle Tree height
     * @param verifier_ Verifier contract address
     *
     * Tree height used to generate verify contract MUST be the same as {treeHeight_}
     */
    constructor(uint256 treeHeight_, IVerifier verifier_) PoseidonIMT(treeHeight_) {
        verifier = verifier_;
    }

    function deposit(bytes32 commitment_) public payable {
        require(msg.value == 1 ether, "Depositor: value must be 1 ether");
        require(!commitments[commitment_], "Depositor: commitment already exists");

        add(commitment_);
        commitments[commitment_] = true;
    }

    function withdraw(
        bytes calldata proof_,
        bytes32 nullifierHash_,
        address payable recipient_
    ) public {
        require(!nullifies[nullifierHash_], "Depositor: nullifier already exists");

        require(
            verifier.verifyProof(proof_, [uint256(getRoot()), uint256(nullifierHash_)]),
            "Invalid withdraw proof"
        );

        nullifies[nullifierHash_] = true;

        (bool success_, ) = recipient_.call{value: 1 ether}("");
        require(success_, "Depositor: withdraw failed");
    }
}
