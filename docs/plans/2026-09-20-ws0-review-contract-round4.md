# Review Contract — PR #342 Round 4 (WS0 tsukoshi salvage)

- **Target**: repo `/home/lucien/working/industrial-algebra/Anima/Cliffy`, branch
  `feature/tsukoshi-salvage`, HEAD `f2446db`. Cumulative diff vs `origin/develop`.
- **Record**: PR **#342** — inline comments at the head SHA; summary + claims
  verdict + ambiguity footer as the review body.
- **Round**: 4. Breaker: 6. **Rounds 1–3 (15 findings) all carry recorded
  dispositions (verified-then-fixed) — settled stays settled without NEW
  evidence at this HEAD.**
- **What changed since round 3**: serde_json+float_roundtrip moved from dev-deps
  to a real dependency; new supported wire API `ObservationSet::to_json_string` /
  `from_json_str` (WireError::{Json, OutOfDomain}); domain validation MOVED out
  of native `Deserialize` into `from_json_str`; constructor/tick debug_asserts
  REMOVED (Rust-only flows keep full u64 end to end); ingestion tests migrated
  to the wire API.

## Claims under scrutiny (post-round-3 surface)

F1. The two-domain design is coherent: native serde round-trips full u64
    (persistence), the wire API enforces [0, 2^53−1] + bit-faithful floats
    (cross-runtime), and each is tested.
F2. A downstream consumer (path dep, own serde_json without features) parses
    bit-exactly — verified by the orchestrator with a scratch crate; re-verify.
F3. `WireError` is a proper error type (Display + Error + source) and the docs
    carry `# Errors` sections; the wire API is exported where users can find it
    (check the crate-root re-exports: is `from_json_str` discoverable?).
F4. The round-3 diff introduced no new failure modes: check `git diff
    98ae300..f2446db` with fresh eyes — especially anything the TS side does
    NOT twin (e.g. TS `fromWire` accepts objects, Rust `from_json_str` accepts
    text — is the asymmetry documented? TS `toWire()` still returns raw objects
    whose JSON.stringify is lossy — is that trap signposted?).
F5. Full matrix: 303 nextest + 32 doctests (both lanes), clippy clean both
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
F1–F5; ambiguity footer mandatory. If zero P1/P2: say CONVERGED explicitly.
