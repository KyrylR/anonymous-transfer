#!/bin/bash
set -e 

CIRCUIT_NAME="Withdraw"
SETUP_POWERS=11
BUILD_DIR=""
CIRCUIT_FILE=""
POWERS_FILE=""

# Define the build directory where intermediate files will be stored
if [ -d ./circuits ]; then
    BUILD_DIR="./circuits/outputs"
    CIRCUIT_FILE="./circuits/$CIRCUIT_NAME.circom"
    POWERS_FILE=./circuits/outputs/$SETUP_POWERS.ptau
elif [ -d ../circuits ]; then
    BUILD_DIR="../circuits/outputs"
    CIRCUIT_FILE="../circuits/$CIRCUIT_NAME.circom"
    POWERS_FILE=./circuits/outputs/$SETUP_POWERS.ptau
else
    echo "Error: can't find way to circuits folder: unknow directory."
    exit 1
fi

if [ -z "$CIRCUIT_NAME" ]; then
    echo "Error: CIRCUIT_NAME is empty."
    exit 1
elif [ ! -e "$CIRCUIT_FILE" ]; then
    echo "Error: circuit doesn't exist."
    exit 1
fi

rm -rf ${BUILD_DIR}
mkdir -p ${BUILD_DIR}

# Compiling circuit with .r1cs and .wasm files as result
echo -e "\nCompiling the circuits..."

circom ${CIRCUIT_FILE} --r1cs --wasm --sym -o ${BUILD_DIR}

mv ${BUILD_DIR}/${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm ${BUILD_DIR}/withdraw.wasm

echo -e "\nCircuit compiled ${BUILD_DIR}"

mkdir -p $BUILD_DIR/$SETUP_POWERS

# Generatin trusted setup as powers/SETUP_POWERS.ptau
echo -e "\Generating trustep setup..."

snarkjs powersoftau new bn128 ${SETUP_POWERS} ${BUILD_DIR}/${SETUP_POWERS}/pot${SETUP_POWERS}_0000.ptau 
echo $((RANDOM)) | snarkjs powersoftau contribute ${BUILD_DIR}/${SETUP_POWERS}/pot${SETUP_POWERS}_0000.ptau ${BUILD_DIR}/${SETUP_POWERS}/pot${SETUP_POWERS}_0001.ptau --name="Someone" -v

snarkjs powersoftau prepare phase2 ${BUILD_DIR}/${SETUP_POWERS}/pot${SETUP_POWERS}_0001.ptau ${BUILD_DIR}/${SETUP_POWERS}.ptau -v

# Removing redudant files
rm -rf $BUILD_DIR/$SETUP_POWERS

echo -e "\nTrusted setup generated $BUILD_DIR/$SETUP_POWERS.ptau"

# Exporting key with verification_key.json, verifier.sol and circtuis_final.zkey as a result
echo -e "\nExporting keys..."

snarkjs groth16 setup ${BUILD_DIR}/${CIRCUIT_NAME}.r1cs ${POWERS_FILE} ${BUILD_DIR}/${CIRCUIT_NAME}_0000.zkey -v
echo $((RANDOM)) | snarkjs zkey contribute ${BUILD_DIR}/${CIRCUIT_NAME}_0000.zkey ${BUILD_DIR}/circuit_final.zkey --name="Someone" -v

snarkjs zkey export verificationkey ${BUILD_DIR}/circuit_final.zkey ${BUILD_DIR}/verification_key.json
snarkjs zkey export solidityverifier ${BUILD_DIR}/circuit_final.zkey ${BUILD_DIR}/verifier.sol

# Removing redudant files
rm -rf ${BUILD_DIR}/zkey ${BUILD_DIR}/${CIRCUIT_NAME}_0000.zkey

echo -e "\nKeys exported $BUILD_DIR/circuit_final.zkey, $BUILD_DIR/verification_key.json, $BUILD_DIR/verifier.sol"

mv $BUILD_DIR/verifier.sol ./contracts/utils/Verifier.sol