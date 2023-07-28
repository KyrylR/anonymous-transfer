import { expect } from "chai";
import { ethers } from "hardhat";

import { MerkleTree } from "merkletreejs";

import { getPoseidon, poseidonHash } from "@/test/helpers/poseidon-hash";
import { buildSparseMerkleTree, getBytes32PoseidonHash, getRoot } from "@/test/helpers/merkle-tree-helper";

import { Depositor } from "@ethers-v5";
import { generateSecrets, getCommitment, getZKP, SecretPair } from "@/test/helpers/deposit-withdraw-helper";

describe("Depositor", () => {
  let OWNER: string;
  let USER1: string;

  let depositor: Depositor;

  let localMerkleTree: MerkleTree;

  let treeHeight = 5;

  beforeEach(async () => {
    const depositorFactory = await ethers.getContractFactory("Depositor", {
      libraries: {
        PoseidonUnit1L: (await getPoseidon(1)).address,
        PoseidonUnit2L: (await getPoseidon(2)).address,
      },
    });
    depositor = await depositorFactory.deploy(treeHeight, ethers.constants.AddressZero);

    localMerkleTree = buildSparseMerkleTree(poseidonHash, [], treeHeight);
  });

  describe("Deposit flow", () => {
    it("should deposit 1 Q", async () => {
      const commitment = getCommitment(generateSecrets());

      await depositor.deposit(commitment, { value: ethers.utils.parseEther("1") });
      localMerkleTree = buildSparseMerkleTree(
        poseidonHash,
        [getBytes32PoseidonHash(commitment)],
        (await depositor.getHeight()).toNumber()
      );

      expect(await depositor.commitments(commitment)).to.be.true;
      expect(await ethers.provider.getBalance(depositor.address)).to.equal(ethers.utils.parseEther("1"));

      expect(await depositor.getRoot()).to.equal(getRoot(localMerkleTree));
    });

    it("should not deposit any number of Qs except 1", async () => {
      await expect(
        depositor.deposit(ethers.constants.HashZero, { value: ethers.utils.parseEther("0") })
      ).to.be.revertedWith("Depositor: value must be 1 ether");
    });

    it("should not deposit with the same commitment", async () => {
      const commitment = getCommitment(generateSecrets());

      await depositor.deposit(commitment, { value: ethers.utils.parseEther("1") });
      await expect(depositor.deposit(commitment, { value: ethers.utils.parseEther("1") })).to.be.revertedWith(
        "Depositor: commitment already exists"
      );
    });
  });

  describe("Withdraw flow", () => {
    let pair: SecretPair;

    beforeEach(async () => {
      pair = generateSecrets();
      const commitment = getCommitment(pair);
      const commitment1 = getCommitment(generateSecrets());
      const commitment2 = getCommitment(generateSecrets());
      const commitment3 = getCommitment(generateSecrets());
      const commitment4 = getCommitment(generateSecrets());

      await depositor.deposit(commitment1, { value: ethers.utils.parseEther("1") });
      await depositor.deposit(commitment2, { value: ethers.utils.parseEther("1") });
      await depositor.deposit(commitment3, { value: ethers.utils.parseEther("1") });
      await depositor.deposit(commitment, { value: ethers.utils.parseEther("1") });
      await depositor.deposit(commitment4, { value: ethers.utils.parseEther("1") });

      localMerkleTree = buildSparseMerkleTree(
        poseidonHash,
        [
          getBytes32PoseidonHash(commitment1),
          getBytes32PoseidonHash(commitment2),
          getBytes32PoseidonHash(commitment3),
          getBytes32PoseidonHash(commitment),
          getBytes32PoseidonHash(commitment4),
        ],
        (await depositor.getHeight()).toNumber()
      );
    });

    it.only("should withdraw 1 Q", async () => {
      getZKP(pair, localMerkleTree);
    });

    it("should not withdraw with same nullifier", async () => {});

    it("should not withdraw with wrong proof", async () => {});

    it("should not withdraw if asset transfer failed", async () => {});
  });
});
