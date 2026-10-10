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

use cliffy_protocols::observation::{Observation, ObservationPayload, ObservationSet};
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
    let set = ObservationSet::from_json_str(&text).expect("TS wire parses as an ObservationSet");

    assert_eq!(set.len(), 5, "every TS observation ingested");

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

    // Projection over the ingested set: -0.0 + 3.0 + 2.33…e-130 + 7.0
    // laundered through the +0.0-initialized sum = 10.0 (the tiny value is
    // far below 3.0's ulp), mean 10/4 — the exact bits the TS side
    // computes for the same set.
    let mean = scalar_mean(&set).expect("scalars present");
    assert_eq!(mean.to_bits(), (10.0f64 / 4.0).to_bits());

    // The round-2 reviewer's value: default serde_json misrounds it by 1
    // ulp; with float_roundtrip the bits arrive exactly.
    let tricky = set
        .iter()
        .find(|o| o.participant_id == a && o.seq == 2)
        .expect("seq-2 observation present");
    match &tricky.payload {
        ObservationPayload::Scalar(v) => {
            assert_eq!(
                v.to_bits(),
                0x2504_b08b_ac75_584b,
                "2.3318716180463287e-130 parsed bit-exact (float_roundtrip)"
            );
        }
        other => panic!("expected Scalar payload, got {other:?}"),
    }

    // Re-serialization keeps the sign bit (a Rust relay does not launder
    // what the mean laundered — the set is the state).
    let reemitted = serde_json::to_string(&set).expect("set serializes");
    assert!(
        reemitted.contains("-0.0"),
        "Rust re-emission preserves -0.0, got: {reemitted}"
    );
}

/// Round-2 review: the Rust wire boundary enforces the same integer
/// domain the TS side throws `RangeError` on (seq and clock counters).
#[test]
fn rust_wire_rejects_out_of_domain_counters() {
    let base = r#"[{"participant_id":"aaaaaaaa-0000-0000-0000-000000000001","seq":SEQ,"clock":{"clocks":CLOCKS},"payload":{"Scalar":1.0},"grant_ref":null}]"#;

    let over_seq = base
        .replace("SEQ", "9007199254740992")
        .replace("CLOCKS", "{}");
    assert!(
        ObservationSet::from_json_str(&over_seq).is_err(),
        "seq beyond the cross-runtime bound must be rejected"
    );

    let over_clock = base.replace("SEQ", "0").replace(
        "CLOCKS",
        r#"{"aaaaaaaa-0000-0000-0000-000000000001":9007199254740992}"#,
    );
    assert!(
        ObservationSet::from_json_str(&over_clock).is_err(),
        "clock counter beyond the cross-runtime bound must be rejected"
    );

    let at_bound = base
        .replace("SEQ", "9007199254740991")
        .replace("CLOCKS", "{}");
    assert!(
        ObservationSet::from_json_str(&at_bound).is_ok(),
        "the bound itself is legal"
    );
}

/// Round-3 review: native serde is the Rust persistence domain (full
/// u64); the cross-runtime bound applies only to the wire entry points.
/// A Rust-only set with seq beyond the bound must serialize AND reload.
#[test]
fn rust_only_full_u64_persistence_round_trips() {
    let mut set = ObservationSet::new();
    set.insert(Observation::new_scalar(
        Uuid::from_u128(1),
        9_007_199_254_740_992, // beyond the cross-runtime bound, legal Rust-only
        1.0,
    ));
    let text = serde_json::to_string(&set).expect("serialize");
    let reloaded: ObservationSet =
        serde_json::from_str(&text).expect("native serde reload keeps the full u64 domain");
    assert_eq!(reloaded.len(), 1);
}

/// Round-3 review: the SUPPORTED wire entry points carry the contract —
/// `from_json_str` validates the cross-runtime domain AND parses
/// bit-faithfully (the library's `serde_json` pins `float_roundtrip` as a
/// real dependency, not a dev-only one).
#[test]
fn supported_wire_api_validates_and_parses_bit_exact() {
    // Out-of-domain rejected at the wire entry point.
    let over = r#"[{"participant_id":"aaaaaaaa-0000-0000-0000-000000000001","seq":9007199254740992,"clock":{"clocks":{}},"payload":{"Scalar":1.0},"grant_ref":null}]"#;
    assert!(
        ObservationSet::from_json_str(over).is_err(),
        "wire entry point rejects out-of-domain seq"
    );

    // Bit-faithful parse of the reviewer's 1-ulp value.
    let tricky = r#"[{"participant_id":"aaaaaaaa-0000-0000-0000-000000000001","seq":0,"clock":{"clocks":{}},"payload":{"Scalar":2.3318716180463287e-130},"grant_ref":null}]"#;
    let set = ObservationSet::from_json_str(tricky).expect("wire parses");
    let obs = set.iter().next().expect("one observation");
    match &obs.payload {
        ObservationPayload::Scalar(v) => {
            assert_eq!(
                v.to_bits(),
                0x2504_b08b_ac75_584b,
                "bit-exact via the supported API"
            );
        }
        other => panic!("expected Scalar, got {other:?}"),
    }

    // to_json_string round-trips through from_json_str.
    let text = set.to_json_string().expect("serialize");
    let reloaded = ObservationSet::from_json_str(&text).expect("reload");
    assert_eq!(reloaded.len(), 1);
}

/// Round-4 review: validation must see EVERY wire record, including ones
/// a duplicate key would collapse — parse to Vec, validate all, THEN build
/// the last-wins set. (The TS port validates during per-record insert and
/// throws `RangeError` on this exact input.)
#[test]
fn wire_validation_precedes_duplicate_collapse() {
    let dup_hides_violation = r#"[
      {"participant_id":"aaaaaaaa-0000-0000-0000-000000000001","seq":0,"clock":{"clocks":{"aaaaaaaa-0000-0000-0000-000000000001":9007199254740992}},"payload":{"Scalar":1.0},"grant_ref":null},
      {"participant_id":"aaaaaaaa-0000-0000-0000-000000000001","seq":0,"clock":{"clocks":{}},"payload":{"Scalar":1.0},"grant_ref":null}
    ]"#;
    assert!(
        ObservationSet::from_json_str(dup_hides_violation).is_err(),
        "a duplicate key must not launder an out-of-domain record"
    );

    // Last-wins still holds for in-domain duplicates.
    let dup_legal = r#"[
      {"participant_id":"aaaaaaaa-0000-0000-0000-000000000001","seq":0,"clock":{"clocks":{}},"payload":{"Scalar":1.0},"grant_ref":null},
      {"participant_id":"aaaaaaaa-0000-0000-0000-000000000001","seq":0,"clock":{"clocks":{}},"payload":{"Scalar":2.0},"grant_ref":null}
    ]"#;
    let set = ObservationSet::from_json_str(dup_legal).expect("in-domain dups parse");
    assert_eq!(set.len(), 1);
    let mean = cliffy_protocols::projection::scalar_mean(&set).expect("scalar");
    assert_eq!(mean.to_bits(), 2.0f64.to_bits(), "last-wins");
}

/// Round-5 review: the wire EMITTER must refuse what its own ingest path
/// rejects — a set that can't cross the wire doesn't get to speak it.
/// (TS needs no such check: its sets are in-domain by construction;
/// native Rust constructors keep the full u64 domain.)
#[test]
fn wire_emitter_rejects_out_of_domain_values() {
    let mut set = ObservationSet::new();
    set.insert(Observation::new_scalar(
        Uuid::from_u128(1),
        9_007_199_254_740_992, // 2^53 — legal natively, out of wire domain
        1.0,
    ));
    assert!(
        set.to_json_string().is_err(),
        "out-of-domain seq refused at emission"
    );

    let mut clocked = ObservationSet::new();
    let mut o = Observation::new_scalar(Uuid::from_u128(1), 0, 1.0);
    o.clock
        .clocks
        .insert(Uuid::from_u128(1), 9_007_199_254_740_992);
    clocked.insert(o);
    assert!(
        clocked.to_json_string().is_err(),
        "out-of-domain clock counter refused at emission"
    );

    // In-domain still emits fine.
    let mut legal = ObservationSet::new();
    legal.insert(Observation::new_scalar(
        Uuid::from_u128(1),
        9_007_199_254_740_991,
        1.0,
    ));
    assert!(legal.to_json_string().is_ok(), "the bound itself emits");
}
