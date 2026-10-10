# Review Contract — PR #342 Round 1 (WS0 tsukoshi salvage)

- **Target**: repo `/home/lucien/working/industrial-algebra/Anima/Cliffy`, branch
  `feature/tsukoshi-salvage`, HEAD `e5d4a25`. Cumulative diff vs `origin/develop`.
- **Record**: PR **#342** (Industrial-Algebra/Cliffy) — findings post as inline PR
  comments at the current head SHA; summary + claims verdict + ambiguity footer as
  the review body (`gh pr review 342 --comment`).
- **Round**: 1. Breaker: 6 rounds. No prior dispositions exist.
- **Context**: this PR ports the Rust Phase 1 salvage (ObservationSet + deterministic
  projections + cyclic Jacobi eigen) to TypeScript (`cliffy-tsukoshi`), adds a
  cross-runtime bit-parity oracle, and deletes the pre-salvage unsound surface.
  The authoring session is also the Rust-side author — the reviewer's value is
  attacking the port's faithfulness, not admiring symmetry.

## Claims under scrutiny (verbatim from the PR body / commit message)

C1. "All 26 parity tests pass **bit-identical**, including the full Jacobi consensus
    path." (`toBe` — approximation is not parity)
C2. "faithful to the Rust determinism contract **down to the fold order**" — the TS
    port of `observation.ts` / `projection.ts` / `eigen.ts` matches the Rust
    semantics in `cliffy-protocols/src/{observation,projection,eigen}.rs`.
C3. Duplicate-key semantics mirror Rust exactly: **insert = last-wins, merge =
    first-wins, wire = last-wins** (BTreeMap semantics).
C4. Canonical iteration is ascending `(participant, seq)`; "hyphenated lowercase
    UUID string order == byte order" — no insertion-order dependence anywhere in
    canonical paths.
C5. `f64::signum` keeps −0's sign bit while `Math.sign` doesn't; the port's
    `rustSignum()` helper is used at exactly the sites Rust calls `signum`, and
    without it the Jacobi path could diverge.
C6. `Number.MIN_VALUE === f64::MIN_POSITIVE` (not EPSILON) — the port's degenerate-
    skip floor uses the right constant.
C7. Wire format is "Rust-compatible JSON": TS `toWire()` output is byte-comparable
    to Rust `serde_json` output for the same set, and TS `fromWire()` ingests
    Rust-generated wire.
C8. "the cutover" is complete: `GeometricCRDT`, `geometricMean`, `GA3Lattice`,
    `GeometricConsensus` and the consensus module are gone from tsukoshi src,
    exports, README, and no dangling imports remain anywhere in the repo
    (examples included); `ComponentLattice`/`latticeJoin`/`latticeMeet` remain.
C9. Test matrix as claimed: tsukoshi **134/134** (was 113 — arithmetic should net
    out against deleted/added suites), `tsc` clean, dual ESM/CJS exports verified;
    cargo workspace **298 nextest + 32 doctests** on pinned nightly AND stable;
    examples typecheck gate 0 errors + 13/13 builds.
C10. `scalarMean`/`vectorMean`/`rotorConsensus` return null on the empty set and
     skip degenerate (norm < 1e-12) rotors — "never fabricate".

## Verification instructions

Reproduce (do not trust):
1. `cargo test -p cliffy-protocols --test parity_vectors` — green.
2. Regenerate: `CLIFFY_PARITY_WRITE=1 cargo test -p cliffy-protocols --test
   parity_vectors` then `git status --porcelain test-vectors/` — MUST be clean
   (drift guard is meaningful only if regeneration is byte-stable).
3. `cd cliffy-tsukoshi && npm ci && npx vitest run src/protocols/parity.test.ts`
   — 26/26 with exact equality.
4. Audit the parity tests for **vacuity**: can each assertion actually fail?
   Confirm the drift guard compares bytes, and the TS side compares against the
   checked-in JSON, not against its own recomputation.
5. Semantic diff, file pair by file pair: `observation.ts` vs
   `cliffy-protocols/src/observation.rs`; `projection.ts` vs `projection.rs`;
   `eigen.ts` vs `eigen.rs`. Enumerate EVERY behavioral divergence you can find,
   then classify: parity-relevant or provably unreachable in the covered input
   space. Pay particular attention to: dup-key semantics (C3), sort keys (C4),
   the hemisphere reference selection (first *usable* rotor in canonical order),
   sequential accumulation of M, the w≥0 sign flip, the 1e-12 skip floor, the
   Jacobi sweep order / 50-sweep cap / 1e-15 tolerance, and tie-breaking
   (lowest index).
6. Construct adversarial inputs and run them through BOTH sides (small Rust test
   or a scratch binary is fine; keep outputs grep-small): (a) payload scalar
   `-0.0`; (b) a rotor with a NaN component (norm NaN: `< 1e-12` is false →
   *used*, not skipped — same both sides?); (c) seq=0 for multiple participants;
   (d) an **uppercase** participant UUID in the TS API (Rust normalizes to
   lowercase at serialize; does TS? If not, C4/C7 break for that input); (e) a
   wire JSON with keys in non-canonical order fed to `fromWire`.
7. C1 counter-check: does any test assert TS→Rust direction (TS-generated wire
   ingested by Rust)? If not, C7 is only half-covered — report as a coverage gap,
   not a defect, unless you find an actual asymmetry.
8. C8: `rg -n "GeometricCRDT|geometricMean|GA3Lattice|GeometricConsensus"
   --type ts --type md` across the repo (excluding CHANGELOG epitaphs,
   docs/plans, RABBIT_HOLE reports, and intentional epitaph comments) — every
   hit is a finding.
9. C9: rerun the full matrices (use `cargo nextest run --workspace`; stable lane
   via `RUSTUP_TOOLCHAIN=stable`). Arithmetic audit: 113 − (deleted suites) +
   (added suites) = 134 — if you can't make it net out from the diff, say so.

## Output format

Findings tagged **P1 blocking / P2 should-fix / P3 advisory**, each with
file:line, exact reproduction (command/input, observed vs. exact expected),
suggested fix (≤1 paragraph). Then: per-claim verdict (attacked-and-falsified /
attacked-and-survived / unverifiable-with-reason) for C1–C10, and the ambiguity
footer: *ambiguities I resolved and how*.
