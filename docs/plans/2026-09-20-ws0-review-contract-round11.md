# Review Contract — PR #342 Round 11 (WS0 tsukoshi salvage)

- **Target**: repo `/home/lucien/working/industrial-algebra/Anima/Cliffy`, branch
  `feature/tsukoshi-salvage`, HEAD `17eecc2`. Cumulative diff vs `origin/develop`.
- **Record**: PR **#342** — inline comments at the head SHA; summary + claims
  verdict + ambiguity footer as the review body.
- **Round**: 11 (operator extended the loop). **Rounds 1–10 (30 findings)
  all carry recorded dispositions — settled stays settled without NEW
  evidence at this HEAD.** A clean round ends the loop at CONVERGED.
- **What changed since round 10**: TS's fromWire enforces Array.isArray at
  the root (the string-root asymmetry is closed).

## Claims under scrutiny (post-round-10 surface)

M1. The two-domain design is coherent, collapse-safe, shape-safe, AND
    symmetric at the VALUE level (payload cardinality, grant_ref, shapes,
    domains all shared); the three text-level asymmetries are documented
    in both crates and are NOT findings (settled as of round 9).
M2. A downstream consumer (path dep, own serde_json without features) parses
    bit-exactly — verified by the orchestrator with a scratch crate; re-verify.
M3. `WireError` is a proper error type re-exported at the crate root
    (`cliffy_protocols::WireError` compiles downstream); docs carry `# Errors`
    sections.
M4. The round-10 diff introduced no new failure modes: check `git diff
    bfe9df7..17eecc2` with fresh eyes. Value-level acceptance is claimed
    FULLY symmetric (text-level differences are settled documentation) —
    a final adversarial pass over anything not yet tried is welcome;
    10 rounds of scrutiny have covered: merge semantics, UUID hygiene,
    domains, float bits, collapse hazards, shapes, cardinality, roots.
M5. Full matrix: 311 nextest + 32 doctests (both lanes), clippy clean both
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
M1–M5; ambiguity footer mandatory. If zero P1/P2: say CONVERGED explicitly.
