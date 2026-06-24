export interface Groth16Proof {
    a: [bigint, bigint];
    b: [[bigint, bigint], [bigint, bigint]];
    c: [bigint, bigint];
}

export const generateSnarkProof = async ({
    snarkJs,
    inputs,
    circuit,
}: {
    snarkJs: any;
    inputs: Record<string, bigint | bigint[]>;
    circuit: {
        wasm: string;
        zkey: string;
    };
}): Promise<{
    proof: Groth16Proof;
    publicSignals: bigint[];
}> => {
    const { proof, publicSignals } = await snarkJs.groth16.fullProve(
        inputs,
        circuit.wasm,
        circuit.zkey,
    );

    return {
        proof: {
            a: [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])],
            b: [
                [BigInt(proof.pi_b[0][0]), BigInt(proof.pi_b[0][1])],
                [BigInt(proof.pi_b[1][0]), BigInt(proof.pi_b[1][1])],
            ],
            c: [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])],
        },
        publicSignals: publicSignals.map((sig: string) => BigInt(sig)),
    };
};
