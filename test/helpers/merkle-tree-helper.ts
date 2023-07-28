import { MerkleTree } from "merkletreejs";

export function getRoot(tree: MerkleTree) {
  return "0x" + tree.getRoot().toString("hex");
}

export function getProof(hashFunc: any, tree: MerkleTree, leaf: string) {
  return tree.getProof(hashFunc(leaf)).map((e) => "0x" + e.data.toString("hex"));
}

export function buildTree(hashFunc: any, leaves: string[]) {
  return new MerkleTree(leaves, hashFunc, { hashLeaves: true, sortPairs: true });
}

export function buildSparseMerkleTree(hashFunc: any, leaves: string[], height: number) {
  const elementsToAdd = 2 ** height - leaves.length;
  const zeroHash = hashFunc("0x0000000000000000000000000000000000000000000000000000000000000000");
  const zeroElements = Array(elementsToAdd).fill(zeroHash);

  return new MerkleTree([...leaves, ...zeroElements], hashFunc, {
    hashLeaves: false,
    sortPairs: false,
  });
}

export function addElementToTree(hashFunc: any, tree: MerkleTree, element: string) {
  return new MerkleTree([...tree.getLeaves(), element], hashFunc, {
    hashLeaves: true,
    sortPairs: true,
  });
}
