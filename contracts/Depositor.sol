// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import {TypeCaster} from "@solarity/solidity-lib/libs/utils/TypeCaster.sol";
import {VerifierHelper} from "@solarity/solidity-lib/libs/zkp/snarkjs/VerifierHelper.sol";

import {PoseidonUnit1L} from "./libraries/Poseidon.sol";

import {PoseidonSMT} from "./utils/PoseidonSMT.sol";

contract Depositor {
    using TypeCaster for *;

    using VerifierHelper for address;

    address public verifier;
    PoseidonSMT public state;

    mapping(bytes32 => bool) public commitments;
    mapping(bytes32 => bool) public nullifies;

    mapping(bytes32 => bool) public rootsHistory;

    /**
     * @notice Depositor contract constructor
     *
     * @param verifier_ Verifier contract address
     * @param state_ State contract address
     *
     * Tree height used to generate verify contract MUST be the same as {treeHeight_}
     */
    constructor(address verifier_, address state_) {
        verifier = verifier_;

        state = PoseidonSMT(state_);
    }

    function deposit(bytes32 commitment_) public payable {
        require(msg.value == 1 ether, "Depositor: value must be 1 ether");
        require(!commitments[commitment_], "Depositor: commitment already exists");

        state.add(PoseidonUnit1L.poseidon([commitment_]), commitment_);
        commitments[commitment_] = true;
        rootsHistory[state.getRoot()] = true;
    }

    function withdraw(
        bytes32 nullifierHash_,
        address recipient_,
        bytes32 root_,
        VerifierHelper.ProofPoints calldata proof_
    ) public {
        require(!nullifies[nullifierHash_], "Depositor: nullifier already exists");
        require(rootsHistory[root_], "Depositor: root does not exist");

        require(
            verifier.verifyProofSafe(
                [uint256(nullifierHash_), uint256(root_), uint256(uint160(recipient_))]
                    .asDynamic(),
                proof_,
                3
            ),
            "Depositor: Invalid withdraw proof"
        );

        nullifies[nullifierHash_] = true;

        (bool success_, ) = payable(recipient_).call{value: 1 ether}("");
        require(success_, "Depositor: withdraw failed");
    }
}
