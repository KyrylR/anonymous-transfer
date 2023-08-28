// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {TypeCaster} from "@dlsl/dev-modules/libs/utils/TypeCaster.sol";

import {VerifierHelper} from "@dlsl/dev-modules/libs/zkp/snarkjs/VerifierHelper.sol";

import {PoseidonIMT} from "./utils/PoseidonIMT.sol";

contract Depositor is PoseidonIMT {
    using TypeCaster for *;

    using VerifierHelper for address;

    address public verifier;

    mapping(bytes32 => bool) public commitments;
    mapping(bytes32 => bool) public nullifies;

    mapping(bytes32 => bool) public rootsHistory;

    /**
     * @notice Depositor contract constructor
     *
     * @param treeHeight_ Incremental Merkle Tree height
     * @param verifier_ Verifier contract address
     *
     * Tree height used to generate verify contract MUST be the same as {treeHeight_}
     */
    constructor(uint256 treeHeight_, address verifier_) PoseidonIMT(treeHeight_) {
        verifier = verifier_;
    }

    function deposit(bytes32 commitment_) public payable {
        require(msg.value == 1 ether, "Depositor: value must be 1 ether");
        require(!commitments[commitment_], "Depositor: commitment already exists");

        add(commitment_);
        commitments[commitment_] = true;
        rootsHistory[getRoot()] = true;
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
                [uint256(root_), uint256(nullifierHash_), uint256(uint160(recipient_))]
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
