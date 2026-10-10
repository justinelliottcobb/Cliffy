# ARCHIVED — historical, pre-salvage code

Everything under `archive/` predates the 0.4.0 geometric-CRDT salvage
(2026-09) and the Phase 2 WS0 tsukoshi cutover (PR #342). APIs referenced
here — `GeometricCRDT`, `geometricMean`/`geometric_mean`, `GA3Lattice`,
`GeometricConsensus`, replay architectures with per-node op ids — were
**deleted for unsoundness** (merge could annihilate data; joins were not
semilattices). These files are kept as history and failure-mode evidence,
not documentation. Do not copy patterns from here; the sound floor is
`ObservationSet` + deterministic projections (see `docs/plans/` and the
crate READMEs).
