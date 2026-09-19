# ADR 002: Zero-Knowledge Solvency Design

## Context
A Sovereign-AMM processes energy trades for a physical microgrid. It is critical that the community can verify the market maker is not naked shorting energy (selling more energy than exists in the physical battery) while preserving the privacy of the order flow and exact battery State of Charge (SoC).

## Decision
We will stub the implementation of a ZK-Solvency engine using **Pedersen Commitments** and **Bulletproofs**.

### Pedersen Commitments
Used to blind the volumes of bids and asks. A Pedersen commitment $C = g^v h^r$ commits to volume $v$ with blinding factor $r$. Due to the homomorphic property, the community can verify that $\sum C_{ask} = \sum C_{bid}$ for matched trades without knowing individual volumes.

### Bulletproofs
Used to prove that the resulting battery State of Charge ($SoC$) lies within the safe operational bounds $[0, Q_{max}]$ after a block of trades. A Bulletproof range proof allows the engine to prove $0 \le SoC \le Q_{max}$ without leaking the actual $SoC$ scalar.

## Status
**Stubbed** (Phase 5). The interfaces exist in `engine/stubs/crypto_zk_proofs.py` but raise `NotImplementedError` per hackathon constraints.
