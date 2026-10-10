# Review Contract — PR #342 Round 5 (WS0 tsukoshi salvage)

- **Target**: repo `/home/lucien/working/industrial-algebra/Anima/Cliffy`, branch
  `feature/tsukoshi-salvage`, HEAD `5675e0c`. Cumulative diff vs `origin/develop`.
- **Record**: PR **#342** — inline comments at the head SHA; summary + claims
  verdict + ambiguity footer as the review body.
- **Round**: 5. Breaker: 6. **Rounds 1–4 (18 findings) all carry recorded
  dispositions (verified-then-fixed) — settled stays settled without NEW
  evidence at this HEAD.**
- **What changed since round 4**: `from_json_str` validates the parsed Vec
  BEFORE duplicate-key collapse; `WireError` re-exported at the crate root;
  `toWire()` carries the -0 warning; README documents the JSON-text pair;
  stale debug_assert wording replaced.

## Claims under scrutiny (post-round-4 surface)

G1. The two-domain design is coherent AND duplicate-safe: validation
    precedes collapse in `from_json_str`; native serde round-trips full u64;
    the wire API enforces [0, 2^53−1] + bit-faithful floats.
G2. A downstream consumer (path dep, own serde_json without features) parses
    bit-exactly — verified by the orchestrator with a scratch crate; re-verify.
G3. `WireError` is a proper error type re-exported at the crate root
    (`cliffy_protocols::WireError` compiles downstream); docs carry `# Errors`
    sections.
G4. The round-4 diff introduced no new failure modes: check `git diff
    bac67a4..5675e0c` with fresh eyes. TS/Rust twinning: TS `fromWireJson`
    (text) ⟷ Rust `from_json_str` (text); TS `toWire()` raw objects carry the
    -0 warning at the site. Any remaining asymmetric trap is a finding.
G5. Full matrix: 304 nextest + 32 doctests (both lanes), clippy clean both
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
G1–G5; ambiguity footer mandatory. If zero P1/P2: say CONVERGED explicitly.
