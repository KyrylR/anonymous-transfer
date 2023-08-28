pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/mux1.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";

// computes Poseidon(nullifier + secret)
template CommitmentHasher() {
    signal input secret;
    signal input nullifier;

    signal output commitment;
    signal output nullifierHash;

    component commitmentHasher = Poseidon(2);
    component nullifierHasher = Poseidon(1);

    nullifierHasher.inputs[0] <== nullifier;

    commitmentHasher.inputs[0] <== secret;
    commitmentHasher.inputs[1] <== nullifier;

    commitment <== commitmentHasher.out;
    nullifierHash <== nullifierHasher.out;
}

template HashLeftRight() {
    signal input left;
    signal input right;

    signal output hash;

    component hasher = Poseidon(2);

    hasher.inputs[0] <== left;
    hasher.inputs[1] <== right;

    hash <== hasher.out;
}

template MerkleTreeInclusionProof(n_levels) {
    signal input leaf;
    signal input path_index[n_levels];
    signal input path_elements[n_levels];
    signal output root;

    component hashers[n_levels];
    component mux[n_levels];

    signal levelHashes[n_levels + 1];
    levelHashes[0] <== leaf;

    for (var i = 0; i < n_levels; i++) {
        // Should be 0 or 1
        path_index[i] * (1 - path_index[i]) === 0;

        hashers[i] = HashLeftRight();
        mux[i] = MultiMux1(2);

        mux[i].c[0][0] <== levelHashes[i];
        mux[i].c[0][1] <== path_elements[i];

        mux[i].c[1][0] <== path_elements[i];
        mux[i].c[1][1] <== levelHashes[i];

        mux[i].s <== path_index[i];
        hashers[i].left <== mux[i].out[1];
        hashers[i].right <== mux[i].out[0];

        levelHashes[i + 1] <== hashers[i].hash;
    }

    root <== levelHashes[n_levels];
}

template LeafExists(levels){
  // Ensures that a leaf exists within a merkletree with given `root`

  // levels is depth of tree
  signal input leaf;

  signal input path_elements[levels];
  signal input path_index[levels];

  signal input root;

  component merkletree = MerkleTreeInclusionProof(levels);
  merkletree.leaf <== leaf;
  for (var i = 0; i < levels; i++) {
    merkletree.path_index[i] <== path_index[i];
    merkletree.path_elements[i] <== path_elements[i];
  }

  root === merkletree.root;
}

// Verifies that commitment that corresponds to given secret and nullifier is included in the merkle tree of deposits
template Withdraw(levels) {
    signal input root;
    signal input nullifierHash;

    signal input recipient; // not taking part in any computations

    signal input secret;
    signal input nullifier;

    signal input pathElements[levels];
    signal input pathIndices[levels];

    component hasher = CommitmentHasher();

    hasher.secret <== secret;
    hasher.nullifier <== nullifier;
    hasher.nullifierHash === nullifierHash;

    component tree = LeafExists(levels);

    component leafHasher = Poseidon(1);
    leafHasher.inputs[0] <== hasher.commitment;

    tree.leaf <== leafHasher.out;
    tree.root <== root;

    for (var i = 0; i < levels; i++) {
        tree.path_elements[i] <== pathElements[i];
        tree.path_index[i] <== pathIndices[i];
    }

    // Add hidden signals to make sure that tampering with recipient or fee will invalidate the snark proof
    // Most likely it is not required, but it's better to stay on the safe side and it only takes 2 constraints
    // Squares are used to prevent optimizer from removing those constraints
    signal recipientSquare <== recipient;
}

component main {public [root, nullifierHash, recipient]} = Withdraw(6);
