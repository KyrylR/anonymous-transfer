pragma circom 2.0.0;

include "../node_modules/maci-circuits/circom/trees/incrementalMerkleTree.circom";

// computes Poseidon(nullifier + secret)
template CommitmentHasher() {
    signal input secret;
    signal input nullifier;

    signal output commitment;
    signal output nullifierHash;

    component commitmentHasher = Poseidon(2);
    component nullifierHasher = Poseidon(1);

    nullifierHasher.inputs[0] <== nullifier;

    commitmentHasher.inputs[0] <== nullifier;
    commitmentHasher.inputs[1] <== secret;
    
    commitment <== commitmentHasher.out;
    nullifierHash <== nullifierHasher.out;
}

// Verifies that commitment that corresponds to given secret and nullifier is included in the merkle tree of deposits
template Withdraw(levels) {
    signal input root;
    signal input nullifierHash;

    signal input secret;
    signal input nullifier;

    signal input pathElements[levels];
    signal input pathIndices[levels];

    component hasher = CommitmentHasher();
    
    hasher.secret <== secret;
    hasher.nullifier <== nullifier;

    hasher.nullifierHash === nullifierHash;

    component tree = LeafExists(levels);

    tree.leaf <== hasher.commitment;
    tree.root <== root;

    for (var i = 0; i < levels; i++) {
        tree.path_elements[i][0] <== pathElements[i];
        tree.path_index[i] <== pathIndices[i];
    }
}

component main {public [root, nullifierHash]} = Withdraw(6);
