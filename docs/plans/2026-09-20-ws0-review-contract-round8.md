# Review Contract — PR #342 Round 8 (WS0 tsukoshi salvage)

- **Target**: repo `/home/lucien/working/industrial-algebra/Anima/Cliffy`, branch
  `feature/tsukoshi-salvage`, HEAD `89762e7`. Cumulative diff vs `origin/develop`.
- **Record**: PR **#342** — inline comments at the head SHA; summary + claims
  verdict + ambiguity footer as the review body.
- **Round**: 8 (operator extended the loop). **Rounds 1–7 (22 findings) all
  carry recorded dispositions (verified-then-fixed) — settled stays settled
  without NEW evidence at this HEAD.** A clean round ends the loop at
  CONVERGED.
- **What changed since round 7**: the Value pre-pass is now validation-ONLY
  (typed parse uses the original text — input-order last-wins preserved);
  positional serde struct forms are rejected as schema violations (every
  accepted shape is an inspected shape).

## Claims under scrutiny (post-round-7 surface)

J1. The two-domain design is coherent, collapse-safe, shape-safe, AND
    symmetric: `from_json_str` validates on the raw Value (pre-collapse,
    both alias hazards), rejects positional forms, typed-parses the original
    text (input-order last-wins), and the emitter validates before
    serializing; native serde round-trips full u64 in both directions.
J2. A downstream consumer (path dep, own serde_json without features) parses
    bit-exactly — verified by the orchestrator with a scratch crate; re-verify.
J3. `WireError` is a proper error type re-exported at the crate root
    (`cliffy_protocols::WireError` compiles downstream); docs carry `# Errors`
    sections.
J4. The round-7 diff introduced no new failure modes: check `git diff
    bdbbf70..89762e7` with fresh eyes — especially double-parse consistency
    (Value pre-pass then typed from_str on the same text: can they disagree
    on anything — duplicate detection, number handling, nesting depth
    limits?) and whether TS fromWireJson shares every rejection the Rust
    pre-pass now makes (map-shape enforcement — does TS reject positional
    forms too, or is that Rust-only strictness that needs documenting?).
J5. Full matrix: 308 nextest + 32 doctests (both lanes), clippy clean both
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
J1–J5; ambiguity footer mandatory. If zero P1/P2: say CONVERGED explicitly.
