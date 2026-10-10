# Review Contract — PR #342 Round 2 (WS0 tsukoshi salvage)

- **Target**: repo `/home/lucien/working/industrial-algebra/Anima/Cliffy`, branch
  `feature/tsukoshi-salvage`, HEAD `41a9280` (post-round-1 fixes). Cumulative diff
  vs `origin/develop`.
- **Record**: PR **#342** — findings as inline comments at the current head SHA;
  summary + claims verdict + ambiguity footer as the review body.
- **Round**: 2. Breaker: 6. **Round 1's eight findings have recorded dispositions
  on their inline threads (all verified-then-fixed in 41a9280) — settled stays
  settled: do not re-raise without NEW evidence (a new reproduction against this
  HEAD or a changed line).**
- **What changed since round 1**: eigen skip floor (`2 ** -1022`); UUID validation
  + lowercase canonicalization; seq/clock bound `[0, 2^53−1]` (RangeError TS,
  `MAX_CROSS_RUNTIME_SEQ` + `debug_assert` Rust); sets clone + deep-freeze on
  insert; new `toWireJson()` bit-faithful encoder; vectors v2 (raw insertion
  orders + `scalar_signed_zero` case); new `ts_wire_ingestion.rs` (reverse
  direction); new `tsukoshi-checks` CI job; doc cutover completed; archive banners.

## Claims under scrutiny (the post-fix surface, verbatim from the fix commit)

D1. The reviewer's round-1 adversarial matrix now produces bit-identical results
    in both runtimes (pinned: eigenvalues 2.0/2.0/3.999999999999999/5.999999999999999).
D2. Case aliases of a UUID key the SAME entry: the round-1 repro now yields size 2,
    mean 2.5, matching Rust. Non-UUID participants throw TypeError, mirroring
    serde's rejection.
D3. seq and clock counters outside [0, 2^53−1] throw RangeError (TS) /
    debug_assert (Rust); the bound itself is legal on both sides.
D4. Caller-side mutation cannot rewrite set contents: constructors and insert
    deep-freeze; the round-1 repro's mutation throws in strict mode.
D5. `toWireJson()` is bit-faithful: every emitted number parses back to the
    identical f64 including -0; `ts_wire_ingestion.rs` proves serde accepts it
    and the sign bit survives (NOT claimed: byte-identity with serde_json).
D6. Vectors v2 permutations are raw insertion orders; every permutation replays
    bit-identically via insert AND via split-merge, in both runtimes.
D7. `npm run typecheck` (tsc --noEmit) is clean and gated by the new
    `tsukoshi-checks` CI job.
D8. The doc cutover is now complete: no references to the deleted APIs outside
    CHANGELOG/epitaphs/docs-plans/rabbit-hole reports and banner-labeled archives.
D9. Regeneration is byte-stable on both sides (Rust drift guard clean; TS wire
    fixture drift guard clean) and the two fixture files are mutually consistent.
D10. The ownership change did not alter projection semantics: all round-1 parity
     assertions still hold (157/157 tsukoshi, 300 nextest, 32 doctests).

## Verification instructions

Reproduce (do not trust):
1. Full matrix: `cargo nextest run --workspace` and
   `RUSTUP_TOOLCHAIN=stable cargo nextest run --workspace`;
   `cd cliffy-tsukoshi && npm ci && npm run typecheck && npm run build && npm test`.
2. Byte-stability: `CLIFFY_PARITY_WRITE=1 cargo test -p cliffy-protocols --test
   parity_vectors` then `git status --porcelain test-vectors/` — clean; same for
   `CLIFFY_PARITY_WRITE=1 npx vitest run src/protocols/parity.test.ts` in
   cliffy-tsukoshi — clean. If either writes, that is a P1 drift finding.
3. Attack the NEW boundary code, not just the round-1 repros: (a) UUID-shaped but
   exotic inputs — nil UUID, max UUID, UUID with braces/URN prefix (Rust
   `Uuid::parse_str` accepts simple/braced/urn forms; the TS port accepts
   hyphenated only — is the narrower domain documented and harmless for wire
   input, which is always hyphenated?); (b) `structuredClone` fidelity: a payload
   of `{Scalar: -0}` through insert — does the clone keep the sign bit (it must;
   assert it); (c) `grant_ref` non-null round trip through insert/fromWire; (d)
   a wire observation whose `clock.clocks` has non-empty entries — canonicalized
   keys, bounded values, frozen; (e) merge of sets containing the SAME key with
   DIFFERENT payloads (first-wins) vs insert (last-wins) — both pinned?
4. `toWireJson` adversarial: emit a set containing `1e21`, `5e-324`, `-0`,
   `0.1+0.2`, and feed the output to `serde_json::from_str::<ObservationSet>`
   in a scratch Rust test — every payload field must parse to the identical
   `to_bits()`. Report any mismatch with the exact value.
5. Vacuity audit, round 2: can the new tests actually fail? Specifically —
   does the TS split-merge replay exercise `merge` with genuinely different
   partitions (odd-length permutations); does `scalar_signed_zero` fail if the
   wire loses the sign; does the eigen test fail if the floor constant changes.
6. CI gate reality check: read `.github/workflows/ci.yml` `tsukoshi-checks` —
   would a `tsc --noEmit` failure actually fail the job (no `--if-present`
   swallow, no `continue-on-error`)?
7. D8: rerun the repo-wide `rg` for the deleted identifiers with the same
   exclusions as round 1 — every remaining hit is a finding.

## Output format

As round 1: P1/P2/P3 with file:line, exact reproduction, suggested fix; per-claim
verdict for D1–D10; ambiguity footer mandatory.
