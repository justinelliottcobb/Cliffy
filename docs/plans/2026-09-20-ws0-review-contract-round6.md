# Review Contract — PR #342 Round 6 (WS0 tsukoshi salvage) — BREAKER ROUND

- **Target**: repo `/home/lucien/working/industrial-algebra/Anima/Cliffy`, branch
  `feature/tsukoshi-salvage`, HEAD `0595fe4`. Cumulative diff vs `origin/develop`.
- **Record**: PR **#342** — inline comments at the head SHA; summary + claims
  verdict + ambiguity footer as the review body.
- **Round**: 6 — THE BREAKER ROUND. **Rounds 1–5 (19 findings) all carry
  recorded dispositions (verified-then-fixed) — settled stays settled without
  NEW evidence at this HEAD.** If this round posts findings, the loop stops,
  the outstanding set is summarized, and merge stays blocked pending operator
  escalation.
- **What changed since round 5**: `to_json_string` validates the cross-runtime
  domain BEFORE serializing (emitter/ingest symmetry); native serde stays
  unrestricted.

## Claims under scrutiny (post-round-5 surface)

H1. The two-domain design is coherent, duplicate-safe, AND symmetric:
    validation precedes collapse in `from_json_str`; the emitter validates
    before serializing; native serde round-trips full u64 in both directions.
H2. A downstream consumer (path dep, own serde_json without features) parses
    bit-exactly — verified by the orchestrator with a scratch crate; re-verify.
H3. `WireError` is a proper error type re-exported at the crate root
    (`cliffy_protocols::WireError` compiles downstream); docs carry `# Errors`
    sections.
H4. The round-5 diff introduced no new failure modes: check `git diff
    ba37694..0595fe4` with fresh eyes. The wire contract is now symmetric
    (emitter validates what ingest rejects); any remaining asymmetric trap
    is a finding.
H5. Full matrix: 305 nextest + 32 doctests (both lanes), clippy clean both
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
H1–H5; ambiguity footer mandatory. If zero P1/P2: say CONVERGED explicitly.
