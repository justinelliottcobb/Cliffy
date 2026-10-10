# Review Contract — PR #342 Round 9 (WS0 tsukoshi salvage)

- **Target**: repo `/home/lucien/working/industrial-algebra/Anima/Cliffy`, branch
  `feature/tsukoshi-salvage`, HEAD `e5d096d`. Cumulative diff vs `origin/develop`.
- **Record**: PR **#342** — inline comments at the head SHA; summary + claims
  verdict + ambiguity footer as the review body.
- **Round**: 9 (operator extended the loop). **Rounds 1–8 (24 findings) all
  carry recorded dispositions (verified-then-fixed) — settled stays settled
  without NEW evidence at this HEAD.** A clean round ends the loop at
  CONVERGED.
- **What changed since round 8**: shape enforcement is now SYMMETRIC — Rust's
  pre-pass rejects positional Vector/Rotor payload bodies; TS's ownObservation
  validates payload shape + component finiteness (it previously validated
  NOTHING about payloads) and rejects non-map clock.clocks.

## Claims under scrutiny (post-round-8 surface)

K1. The two-domain design is coherent, collapse-safe, shape-safe, AND
    symmetric — INCLUDING payload shapes: both boundaries reject positional
    Vector/Rotor bodies, non-map clock.clocks, and non-finite/missing
    payload components (TS's ownObservation validates all of these).
K2. A downstream consumer (path dep, own serde_json without features) parses
    bit-exactly — verified by the orchestrator with a scratch crate; re-verify.
K3. `WireError` is a proper error type re-exported at the crate root
    (`cliffy_protocols::WireError` compiles downstream); docs carry `# Errors`
    sections.
K4. The round-8 diff introduced no new failure modes: check `git diff
    78c0167..e5d096d` with fresh eyes. The rejection SETS should now be
    identical across runtimes — actively fuzz for asymmetry: generate
    malformed wire variants (wrong types, extra fields, nested arrays,
    unicode keys, deep nesting) and compare accept/reject + error class on
    both sides. Any divergence is a finding.
K5. Full matrix: 309 nextest + 32 doctests (both lanes), clippy clean both
    lanes, tsukoshi 158/158 + tsc clean, drift guards byte-stable.

## Verification instructions

1. Reproduce F5 (both Rust lanes; tsukoshi; drift guards via CLIFFY_PARITY_WRITE
   + git status).
2. F2: recreate the scratch downstream consumer (path dep + `serde_json =
   "=1.0.151"`, no features) and parse `2.3318716180463287e-130` BOTH ways —
   direct `serde_json::from_str` and `ObservationSet::from_json_str`. Both must
   give bits `0x2504_b08b_ac75_584b`.
3. F1 edge battery at the NEW boundary: legal-at-bound, over-bound, and
   full-u64 persistence round-trip; TS `fromWireJson` on the same three.
4. F3: `cargo doc -p cliffy-protocols --no-deps` clean; check
   `cliffy_protocols::WireError` is reachable from the crate root (or flag it).
5. F4: read the TS export surface (`src/index.ts`, `protocols/index.ts`) against
   the Rust one — are the wire methods exported and documented on both sides?
   Is the `toWire()`-is-lossy trap (JSON.stringify drops -0) signposted in the
   `toWire` doc comment?

## Output format

P1/P2/P3 with file:line, exact reproduction, suggested fix; per-claim verdicts
K1–K5; ambiguity footer mandatory. If zero P1/P2: say CONVERGED explicitly.
