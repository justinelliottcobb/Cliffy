# Review Contract — PR #342 Round 10 (WS0 tsukoshi salvage)

- **Target**: repo `/home/lucien/working/industrial-algebra/Anima/Cliffy`, branch
  `feature/tsukoshi-salvage`, HEAD `b3487ef`. Cumulative diff vs `origin/develop`.
- **Record**: PR **#342** — inline comments at the head SHA; summary + claims
  verdict + ambiguity footer as the review body.
- **Round**: 10 (operator extended the loop). **Rounds 1–9 (29 findings)
  all carry recorded dispositions (verified-then-fixed or documented-as-
  text-level-strictness) — settled stays settled without NEW evidence at
  this HEAD.** A clean round ends the loop at CONVERGED.
- **What changed since round 9**: TS enforces payload cardinality (exactly
  one variant key) and accepts missing grant_ref as null; the three
  text-level asymmetries (float tokens, duplicate fields, nesting depth)
  are DOCUMENTED in both crates with the error-class mapping.

## Claims under scrutiny (post-round-9 surface)

L1. The two-domain design is coherent, collapse-safe, shape-safe, AND
    symmetric at the VALUE level (payload cardinality, grant_ref, shapes,
    domains all shared); the three text-level asymmetries are documented
    in both crates and are NOT findings (settled as of round 9).
L2. A downstream consumer (path dep, own serde_json without features) parses
    bit-exactly — verified by the orchestrator with a scratch crate; re-verify.
L3. `WireError` is a proper error type re-exported at the crate root
    (`cliffy_protocols::WireError` compiles downstream); docs carry `# Errors`
    sections.
L4. The round-9 diff introduced no new failure modes: check `git diff
    eb2a596..b3487ef` with fresh eyes. Value-level acceptance should now be
    identical — fuzz again if you like, but text-level differences (token
    shape, duplicate fields, depth) are settled documentation. NEW attack
    surface worth trying: what the two runtimes do with ACCEPTED-but-weird
    values (huge valid vectors, unicode canonicalization beyond ASCII case,
    structuredClone vs serde edge values) — divergence THERE is a finding.
L5. Full matrix: 311 nextest + 32 doctests (both lanes), clippy clean both
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
L1–L5; ambiguity footer mandatory. If zero P1/P2: say CONVERGED explicitly.
