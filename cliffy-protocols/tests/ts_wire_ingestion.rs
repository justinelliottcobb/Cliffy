// Copyright (C) 2026 Industrial Algebra
// SPDX-License-Identifier: Apache-2.0

//! TS-emitted wire ingestion — the reverse direction of the cross-runtime
//! contract (review round 1, PR #342: the original suite only proved
//! Rust→TS). `test-vectors/ts-emitted-wire.json` is emitted by
//! cliffy-tsukoshi's parity vitest via `ObservationSet.toWireJson()` and
//! drift-guarded there; here we prove Rust ingests it bit-faithfully:
//! -0.0's sign bit survives, integer-styled floats ("3.0") parse, and the
//! max-safe seq key round-trips.

#![allow(clippy::expect_used)]
#![allow(clippy::float_cmp)]

use std::path::PathBuf;

use cliffy_protocols::observation::{ObservationPayload, ObservationSet};
use cliffy_protocols::projection::scalar_mean;
use uuid::Uuid;

fn ts_wire_path() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("test-vectors")
        .join("ts-emitted-wire.json")
}

#[test]
fn rust_ingests_ts_emitted_wire_bit_faithfully() {
    let path = ts_wire_path();
    let text = std::fs::read_to_string(&path).unwrap_or_else(|e| {
        panic!(
            "TS wire fixture missing at {} ({e}) — the tsukoshi parity suite emits it",
            path.display()
        )
    });

    // Serde must accept the TS wire whole: hyphenated lowercase UUIDs,
    // "-0.0", integer-styled floats, the max-safe seq.
    let set: ObservationSet =
        serde_json::from_str(&text).expect("TS wire parses as an ObservationSet");

    assert_eq!(set.len(), 4, "every TS observation ingested");

    // The sign bit survived: the scalar at seq 0 is bit-exact -0.0.
    let a = Uuid::parse_str("aaaaaaaa-0000-0000-0000-000000000001").expect("valid uuid");
    let neg_zero = set
        .iter()
        .find(|o| o.participant_id == a && o.seq == 0)
        .expect("seq-0 observation present");
    match &neg_zero.payload {
        ObservationPayload::Scalar(v) => {
            assert_eq!(v.to_bits(), (-0.0f64).to_bits(), "-0.0 sign bit preserved");
        }
        other => panic!("expected Scalar payload, got {other:?}"),
    }

    // The max-safe seq key survived as a key (2^53 − 1).
    assert!(
        set.iter().any(|o| o.seq == (1 << 53) - 1),
        "max-safe seq present"
    );

    // Projection over the ingested set: -0.0 + 3.0 + 7.0 laundered through
    // the +0.0-initialized sum = 10.0, mean 10/3 — the exact bits the TS
    // side computes for the same set.
    let mean = scalar_mean(&set).expect("scalars present");
    assert_eq!(mean.to_bits(), (10.0f64 / 3.0).to_bits());

    // Re-serialization keeps the sign bit (a Rust relay does not launder
    // what the mean laundered — the set is the state).
    let reemitted = serde_json::to_string(&set).expect("set serializes");
    assert!(
        reemitted.contains("-0.0"),
        "Rust re-emission preserves -0.0, got: {reemitted}"
    );
}
