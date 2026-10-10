# Review Contract — PR #342 Round 3 (WS0 tsukoshi salvage)

- **Target**: repo `/home/lucien/working/industrial-algebra/Anima/Cliffy`, branch
  `feature/tsukoshi-salvage`, HEAD `abab01a`. Cumulative diff vs `origin/develop`.
- **Record**: PR **#342** — inline comments at the head SHA; summary + claims
  verdict + ambiguity footer as the review body.
- **Round**: 3. Breaker: 6. **Rounds 1 (8 findings) and 2 (5 findings) all carry
  recorded dispositions on their threads (verified-then-fixed) — settled stays
  settled without NEW evidence at this HEAD.**
- **What changed since round 2**: serde_json `float_roundtrip` enabled; wire
  boundary validation in `ObservationSet::deserialize` (seq AND clock counters
  ≤ 2^53−1); `VectorClock::tick` debug_assert; signed-zero input-bit pins both
  sides; persistent Rust split-merge replay in `project()`; handoff banner.

## Claims under scrutiny (post-round-2 surface)

E1. With `float_roundtrip`, TS-emitted wire decimals parse bit-exactly through
    serde_json — including the round-2 value `2.3318716180463287e-130`
    (bits `0x2504_b08b_ac75_584b`). The feature is actually active in the build
    (feature unification from cliffy-protocols' Cargo.toml).
E2. The wire boundary rejects seq or clock counters > 2^53−1 in Rust (serde
    error) and TS (RangeError); the bound itself is legal on both sides.
E3. `scalar_signed_zero` now fails if the wire loses the input sign bit (the
    input-bit pins), AND still pins the +0 laundering (the projection).
E4. Every permutation in the vectors is replayed in Rust via insert AND
    split-merge with `to_bits()` comparisons; TS replays insert AND split-merge;
    all bit-identical.
E5. No legitimate pre-existing wire regressed: everything the repo itself
    serializes (vectors, fixtures, doc examples, save/load paths in
    cliffy-alive and examples) still round-trips under the new validation.
E6. The full matrix: 301 nextest + 32 doctests (nightly AND stable), clippy
    `-D warnings` clean both lanes, tsukoshi 158/158 + tsc clean, both drift
    guards byte-stable, 13/13 example builds.

## Verification instructions

1. Reproduce the matrix (E6) — both Rust lanes, tsukoshi, examples.
2. E1 attack: build a 10k-value deterministic f64 battery (seeded PRNG over raw
   bits; include subnormals, boundary decimals, the round-2 value), emit via
   TS `formatF64` semantics (scratch script), parse via serde_json IN THIS
   WORKSPACE, compare `to_bits()` — report the exact mismatch count (must be 0).
   Separately verify the feature is active: `cargo tree -e features -i
   serde_json -p cliffy-protocols | grep float_roundtrip`.
3. E2 edge battery: seq = 2^53−1, 2^53, u64::MAX; clock counter at the same
   three values; a wire where the FIRST observation is legal and a LATER one
   violates (partial-ingestion check: the set must reject whole, not half).
4. E3 vacuity re-audit: mutate the checked-in vector's `-0.0` to `0.0` IN MEMORY
   and run the TS suite — the new pin must fail; restore.
5. E5: `rg -n "seq" cliffy-alive/src --type rust | head` and the loadtest —
   any constructor call that could exceed the bound in debug (the
   debug_asserts now fire there). Run the alive suite and loadtest explicitly.
6. Fresh-eyes pass on the round-2 diff itself (`git diff b7249ae..abab01a`):
   new code, new failure modes.

## Output format

As before: P1/P2/P3 with file:line, exact reproduction, suggested fix;
per-claim verdicts E1–E6; ambiguity footer mandatory.
