import { expect } from "chai";
import { ethers } from "hardhat";

import { MerkleTree } from "merkletreejs";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { getPoseidon, poseidonHash } from "@/test/helpers/poseidon-hash";
import { buildSparseMerkleTree, getBytes32PoseidonHash, getRoot } from "@/test/helpers/merkle-tree-helper";

import { Depositor } from "@ethers-v5";
import { generateSecrets, getCommitment, getZKP, SecretPair } from "@/test/helpers/deposit-withdraw-helper";

describe("Depositor", () => {
  let OWNER: SignerWithAddress;
  let USER1: SignerWithAddress;

  let depositor: Depositor;

  let localMerkleTree: MerkleTree;

  let treeHeight = 6;

  beforeEach(async () => {
    [OWNER, USER1] = await ethers.getSigners();

    const verifierFactory = await ethers.getContractFactory("Groth16Verifier");
    const verifier = await verifierFactory.deploy();

    const depositorFactory = await ethers.getContractFactory("Depositor", {
      libraries: {
        PoseidonUnit1L: (await getPoseidon(1)).address,
        PoseidonUnit2L: (await getPoseidon(2)).address,
      },
    });
    depositor = await depositorFactory.deploy(treeHeight, verifier.address);

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

    it("should withdraw 1 Q", async () => {
      const dataToVerify = await getZKP(pair, USER1.address, await depositor.getRoot(), localMerkleTree);

      await depositor.withdraw(dataToVerify.nullifierHash, USER1.address, dataToVerify.formattedProof);
    });

    it("should not withdraw with same nullifier", async () => {
      const dataToVerify = await getZKP(pair, USER1.address, await depositor.getRoot(), localMerkleTree);

      await depositor.withdraw(dataToVerify.nullifierHash, USER1.address, dataToVerify.formattedProof);
      await expect(
        depositor.withdraw(dataToVerify.nullifierHash, USER1.address, dataToVerify.formattedProof)
      ).to.be.revertedWith("Depositor: nullifier already exists");
    });

    it("should not withdraw with wrong proof", async () => {
      const dataToVerify = await getZKP(pair, USER1.address, await depositor.getRoot(), localMerkleTree);

      dataToVerify.formattedProof.a[0] = "0x18d62e34099fd9eab341683f2d30c9a9035fffde7909dbc78b0fde1233f0f774";
      await expect(
        depositor.withdraw(dataToVerify.nullifierHash, USER1.address, dataToVerify.formattedProof)
      ).to.be.revertedWith("Depositor: Invalid withdraw proof");
    });

    it("should not withdraw with different recipient", async () => {
      const recipient = USER1.address;
      const dataToVerify = await getZKP(pair, recipient, await depositor.getRoot(), localMerkleTree);

      await expect(
        depositor.withdraw(dataToVerify.nullifierHash, OWNER.address, dataToVerify.formattedProof)
      ).to.be.revertedWith("Depositor: Invalid withdraw proof");

      await expect(depositor.withdraw(dataToVerify.nullifierHash, recipient, dataToVerify.formattedProof)).to.not.be
        .reverted;
    });

    it("should not withdraw if asset transfer failed", async () => {
      const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
      const ERC20 = await ERC20Factory.deploy("ERC20", "ERC20", 18);

      const dataToVerify = await getZKP(pair, ERC20.address, await depositor.getRoot(), localMerkleTree);

      await expect(
        depositor.withdraw(dataToVerify.nullifierHash, ERC20.address, dataToVerify.formattedProof)
      ).to.be.revertedWith("Depositor: withdraw failed");
    });
  });
});
