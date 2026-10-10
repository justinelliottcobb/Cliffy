/**
 * ObservationSet — the sound CRDT floor, ported from
 * cliffy-protocols/src/observation.rs (Phase 1; Rust original is canonical).
 *
 * The CRDT is the set; geometry is a deterministic projection (see
 * projection.ts). Merge is set union — associative, commutative,
 * idempotent by construction. Nothing here can annihilate, reorder, or
 * diverge.
 *
 * # Canonical order (the cross-runtime contract)
 *
 * Iteration order is ascending (participant_id, seq) — UUIDs compare
 * BYTE-wise in Rust's BTreeMap<(Uuid, u64), _>; the canonical hyphenated
 * lowercase string has the same order (hex digits at fixed positions), so
 * string comparison reproduces it exactly.
 *
 * # Input domain (review round 1, PR #342 — the boundary conditions)
 *
 * - participant_id: a hyphenated UUID, case-insensitive at ingestion,
 *   normalized to lowercase — Rust's Uuid type parses (rejecting non-UUIDs)
 *   and serializes lowercase, so case aliases MUST NOT key distinct entries
 *   here. Anything else throws TypeError, mirroring serde's rejection.
 * - seq: an integer in [0, MAX_CROSS_RUNTIME_SEQ] (2^53 − 1). f64 cannot
 *   represent larger integers; ingesting one would silently collide
 *   distinct Rust keys. Throws RangeError, matching the Rust wire entry
 *   point's WireError::OutOfDomain (from_json_str).
 *
 * # Ownership
 *
 * insert() takes ownership: observations are cloned, canonicalized, and
 * deeply frozen before storage. Mutating a caller-held object after insert
 * (or a reference obtained from entries()/toWire()) cannot rewrite history
 * — the set is a value, like the Rust original. merge() shares the
 * already-frozen records; immutable sharing is behaviorally Rust's clone.
 *
 * # Duplicate-key semantics (mirrors the Rust original precisely)
 *
 * - insert:  LAST-wins (BTreeMap::insert replaces)
 * - merge:   FIRST-wins (entry.or_insert)
 * - fromWire: LAST-wins (documented deserialization behavior)
 *
 * For well-formed input (a participant assigns seq monotonically) the
 * distinction is unobservable — a re-delivered observation is identical.
 * Same-key-different-payload is malformed/Byzantine input outside the
 * contract; the deterministic rule above is all that is promised.
 */

/** Canonical identity: participant-scoped, globally unique without coordination. */
export type ObservationKey = readonly [participantId: string, seq: number];

/**
 * Cross-runtime sequence bound (2^53 − 1): the largest integer exactly
 * representable as f64. Sequences beyond this cannot survive a JS runtime;
 * both sides reject them at the wire (RangeError here,
 * WireError::OutOfDomain from Rust's from_json_str). Native Rust serde
 * keeps the full u64 domain (Rust-only persistence is unbounded).
 */
export const MAX_CROSS_RUNTIME_SEQ = 9007199254740991; // 2**53 - 1

export interface RotorObservation {
  /** Hamilton quaternion, right-handed: scalar (cosine) part. */
  w: number;
  x: number;
  y: number;
  z: number;
}

export interface VectorObservation {
  x: number;
  y: number;
  z: number;
}

export type ObservationPayload =
  | { Scalar: number }
  | { Vector: VectorObservation }
  | { Rotor: RotorObservation };

/**
 * One attributed observation. Field names match the Rust serde wire format
 * exactly, so JSON of the Rust shape IS an Observation (structural typing)
 * — subject to the input-domain rules above (UUID case, seq bound).
 */
export interface Observation {
  /** Observing participant — scopes the sequence number. */
  participant_id: string;
  /** Per-participant monotonic sequence (the participant assigns it). */
  seq: number;
  /** Causal context at observation time. */
  clock: { clocks: Record<string, number> };
  /** What was observed. */
  payload: ObservationPayload;
  /** Provenance grant (Phase 2 capability gating); null = ungated. */
  grant_ref: string | null;
}

const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/**
 * Validate and canonicalize a participant UUID: hyphenated form,
 * case-insensitive in, lowercase out — exactly Rust's parse+serialize
 * round trip, so the two runtimes key identically.
 */
export function canonicalParticipantId(id: string): string {
  if (!UUID_RE.test(id)) {
    throw new TypeError(
      `participant_id must be a hyphenated UUID (Rust's Uuid parse domain), got: ${JSON.stringify(id)}`,
    );
  }
  return id.toLowerCase();
}

function checkSeq(seq: number): void {
  if (!Number.isSafeInteger(seq) || seq < 0) {
    throw new RangeError(
      `seq must be an integer in [0, ${MAX_CROSS_RUNTIME_SEQ}] (the cross-runtime f64 bound), got: ${seq}`,
    );
  }
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const v of Object.values(value)) deepFreeze(v);
    Object.freeze(value);
  }
  return value;
}

/**
 * Clone, canonicalize, validate, and freeze an observation — the set owns
 * its contents from this point (the TS rendering of Rust's value
 * semantics; review round 1 caught caller-side mutation rewriting merged
 * replicas through shared references).
 */
function ownObservation(o: Observation): Observation {
  const owned: Observation = structuredClone(o);
  owned.participant_id = canonicalParticipantId(owned.participant_id);
  checkSeq(owned.seq);
  if (owned.grant_ref !== null) {
    owned.grant_ref = canonicalParticipantId(owned.grant_ref);
  }
  // Map-shape enforcement (review round 8): the wire schema is map-shaped;
  // arrays are objects in JS, so clock.clocks: [] would silently canonicalize
  // to {} where Rust rejects. Payload bodies likewise: positional forms or
  // missing/non-finite components would smuggle NaN into projections.
  const rawClocks: unknown = owned.clock?.clocks;
  if (rawClocks === null || typeof rawClocks !== 'object' || Array.isArray(rawClocks)) {
    throw new TypeError('clock.clocks must be a map (object), not an array or scalar');
  }
  const clocks: Record<string, number> = {};
  for (const [k, v] of Object.entries(rawClocks as Record<string, number>)) {
    checkSeq(v);
    clocks[canonicalParticipantId(k)] = v;
  }
  owned.clock = { clocks };
  validatePayload(owned.payload);
  return deepFreeze(owned);
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function validatePayload(p: ObservationPayload): void {
  if (p === null || typeof p !== 'object' || Array.isArray(p)) {
    throw new TypeError('payload must be a map-shaped variant object');
  }
  if ('Scalar' in p) {
    if (!isFiniteNumber(p.Scalar)) throw new TypeError('payload.Scalar must be a finite number');
  } else if ('Vector' in p) {
    const v: unknown = p.Vector;
    if (v === null || typeof v !== 'object' || Array.isArray(v)) {
      throw new TypeError('payload.Vector must be a map-shaped {x,y,z} body');
    }
    const { x, y, z } = v as VectorObservation;
    if (!isFiniteNumber(x) || !isFiniteNumber(y) || !isFiniteNumber(z)) {
      throw new TypeError('payload.Vector components must be finite numbers');
    }
  } else if ('Rotor' in p) {
    const r: unknown = p.Rotor;
    if (r === null || typeof r !== 'object' || Array.isArray(r)) {
      throw new TypeError('payload.Rotor must be a map-shaped {w,x,y,z} body');
    }
    const { w, x, y, z } = r as RotorObservation;
    if (!isFiniteNumber(w) || !isFiniteNumber(x) || !isFiniteNumber(y) || !isFiniteNumber(z)) {
      throw new TypeError('payload.Rotor components must be finite numbers');
    }
  } else {
    throw new TypeError('unknown payload variant');
  }
}

function observation(id: string, seq: number, payload: ObservationPayload): Observation {
  // Constructor-time validation: build, then run the same ownership path
  // ingestion uses, so invalid input fails identically at every boundary.
  return ownObservation({
    participant_id: id,
    seq,
    clock: { clocks: {} },
    payload,
    grant_ref: null,
  });
}

export function scalarObservation(participantId: string, seq: number, value: number): Observation {
  return observation(participantId, seq, { Scalar: value });
}

export function vectorObservation(
  participantId: string,
  seq: number,
  v: VectorObservation,
): Observation {
  return observation(participantId, seq, { Vector: { ...v } });
}

export function rotorObservation(
  participantId: string,
  seq: number,
  r: RotorObservation,
): Observation {
  return observation(participantId, seq, { Rotor: { ...r } });
}

/** Ascending canonical order: participant UUID (string == byte order), then seq. */
function compareKeys(a: ObservationKey, b: ObservationKey): number {
  if (a[0] < b[0]) return -1;
  if (a[0] > b[0]) return 1;
  return a[1] - b[1];
}

/**
 * Bit-faithful f64 → JSON number text (the wire encoder's number rule):
 * - -0 renders as "-0.0" — JSON.stringify would emit "0", silently
 *   flipping the sign bit a Rust peer can see (serde_json emits "-0.0");
 * - integers render with a trailing ".0" (matching serde_json's float
 *   rendering; "3" and "3.0" parse identically but the .0 form is the
 *   canonical Rust style);
 * - non-finite renders as "null" (serde_json's behavior for NaN/±∞);
 * - everything else uses JS's shortest-round-trip decimal, which parses
 *   to the identical double on every IEEE-754 runtime.
 *
 * NOT byte-identical to serde_json in exponent style for very small/large
 * magnitudes (ryu vs JS differ there); BIT-faithful always — every emitted
 * number parses back to the identical f64, including the -0 sign bit.
 */
function formatF64(v: number): string {
  if (!Number.isFinite(v)) return 'null';
  if (Object.is(v, -0)) return '-0.0';
  const s = String(v);
  if (!/[.e]/.test(s)) return s + '.0';
  return s;
}

function payloadToJson(p: ObservationPayload): string {
  if ('Scalar' in p) return `{"Scalar":${formatF64(p.Scalar)}}`;
  if ('Vector' in p) {
    return `{"Vector":{"x":${formatF64(p.Vector.x)},"y":${formatF64(p.Vector.y)},"z":${formatF64(p.Vector.z)}}}`;
  }
  return `{"Rotor":{"w":${formatF64(p.Rotor.w)},"x":${formatF64(p.Rotor.x)},"y":${formatF64(p.Rotor.y)},"z":${formatF64(p.Rotor.z)}}}`;
}

function observationToJson(o: Observation): string {
  const clockKeys = Object.keys(o.clock.clocks).sort();
  const clocks = clockKeys
    .map((k) => `${JSON.stringify(k)}:${o.clock.clocks[k]}`)
    .join(',');
  return (
    `{"participant_id":${JSON.stringify(o.participant_id)},` +
    `"seq":${o.seq},` +
    `"clock":{"clocks":{${clocks}}},` +
    `"payload":${payloadToJson(o.payload)},` +
    `"grant_ref":${o.grant_ref === null ? 'null' : JSON.stringify(o.grant_ref)}}`
  );
}

/**
 * Grow-only set of attributed observations (G-Set semantics).
 *
 * Backed by a Map keyed `participant_id|seq`; iteration is ALWAYS in
 * canonical sorted order (the Map's insertion order is never exposed to
 * projections — the fold order IS the determinism contract).
 */
export class ObservationSet {
  private readonly observations = new Map<string, Observation>();

  /** Insert (last-wins on duplicate key, mirroring BTreeMap::insert). */
  insert(observation: Observation): boolean {
    const owned = ownObservation(observation);
    const key = ObservationSet.keyString([owned.participant_id, owned.seq]);
    const isNew = !this.observations.has(key);
    this.observations.set(key, owned);
    return isNew;
  }

  /**
   * Union-merge: absorb every observation whose key is absent (first-wins).
   * The absorbed records are already owned and frozen by the source set —
   * immutable sharing is behaviorally Rust's clone. Returns true if
   * anything changed. This is the entire CRDT.
   */
  merge(other: ObservationSet): boolean {
    const before = this.observations.size;
    for (const [key, observation] of other.observations) {
      if (!this.observations.has(key)) {
        this.observations.set(key, observation);
      }
    }
    return this.observations.size !== before;
  }

  get size(): number {
    return this.observations.size;
  }

  get isEmpty(): boolean {
    return this.observations.size === 0;
  }

  contains(key: ObservationKey): boolean {
    return this.observations.has(
      ObservationSet.keyString([canonicalParticipantId(key[0]), key[1]]),
    );
  }

  /**
   * Iterate in canonical (sorted) key order — the ONLY order projections
   * may consume. Yields the set's frozen records: mutation attempts throw
   * in strict mode (ES modules are strict). Allocates a sorted index per
   * call; projections are read-time, and the allocation is the price of
   * the contract.
   */
  *entries(): IterableIterator<Observation> {
    const sorted = [...this.observations.entries()].sort(([ka], [kb]) => {
      const [pa, sa] = ka.split('|');
      const [pb, sb] = kb.split('|');
      return compareKeys([pa, Number(sa)], [pb, Number(sb)]);
    });
    for (const [, observation] of sorted) {
      yield observation;
    }
  }

  /**
   * Wire format: a JSON array of observations in canonical key order.
   *
   * WARNING: \`JSON.stringify(set.toWire())\` LOSES the -0 sign bit (JS
   * renders -0 as "0") and integer/float styling — for the wire, use
   * \`toWireJson()\` (bit-faithful). \`toWire()\` is for structural
   * inspection and in-process handoff.
   */
  toWire(): Observation[] {
    return [...this.entries()];
  }

  /**
   * Wire format as canonical JSON text — bit-faithful (every f64,
   * including -0, round-trips to the identical double through any IEEE-754
   * parser; serde_json included). See formatF64 for the number rule.
   * Prefer this over JSON.stringify(toWire()), which loses the -0 sign.
   */
  toWireJson(): string {
    return `[${[...this.entries()].map(observationToJson).join(',')}]`;
  }

  /** Deserialize (last-wins on duplicate keys, mirroring the Rust side). */
  static fromWire(wire: readonly Observation[]): ObservationSet {
    const set = new ObservationSet();
    for (const o of wire) {
      set.insert(o);
    }
    return set;
  }

  /** Parse + ingest canonical wire JSON (toWireJson or serde_json output). */
  static fromWireJson(json: string): ObservationSet {
    return ObservationSet.fromWire(JSON.parse(json) as Observation[]);
  }

  private static keyString([participantId, seq]: ObservationKey): string {
    return `${participantId}|${seq}`;
  }
}
