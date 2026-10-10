# Review Contract — PR #342 Round 7 (WS0 tsukoshi salvage) — CONFIRMATION ROUND

- **Target**: repo `/home/lucien/working/industrial-algebra/Anima/Cliffy`, branch
  `feature/tsukoshi-salvage`, HEAD `1ad9b61`. Cumulative diff vs `origin/develop`.
- **Record**: PR **#342** — inline comments at the head SHA; summary + claims
  verdict + ambiguity footer as the review body.
- **Round**: 7 — confirmation round authorized by the operator (breaker
  override). **Rounds 1–6 (20 findings) all carry recorded dispositions
  (verified-then-fixed) — settled stays settled without NEW evidence at this
  HEAD.** A clean round ends the loop at CONVERGED.
- **What changed since round 6**: `from_json_str` validates the domain on the
  raw `serde_json::Value` (string keys — no UUID-alias or duplicate collapse)
  BEFORE the typed parse and last-wins set construction.

## Claims under scrutiny (post-round-6 surface)

I1. The two-domain design is coherent, collapse-safe, AND symmetric:
    `from_json_str` validates on the raw Value BEFORE typed parse and BOTH
    collapse hazards (duplicate observation keys, clock-key UUID aliases);
    the emitter validates before serializing; native serde round-trips full
    u64 in both directions.
I2. A downstream consumer (path dep, own serde_json without features) parses
    bit-exactly — verified by the orchestrator with a scratch crate; re-verify.
I3. `WireError` is a proper error type re-exported at the crate root
    (`cliffy_protocols::WireError` compiles downstream); docs carry `# Errors`
    sections.
I4. The round-6 diff introduced no new failure modes: check `git diff
    ef6ce58..1ad9b61` with fresh eyes. Validation is a Value-level pre-pass —
    check it can't be bypassed by schema shapes it doesn't descend into
    (e.g. non-array roots, missing fields — do they error cleanly in the
    typed parse rather than skip validation?).
I5. Full matrix: 306 nextest + 32 doctests (both lanes), clippy clean both
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
I1–I5; ambiguity footer mandatory. If zero P1/P2: say CONVERGED explicitly.
