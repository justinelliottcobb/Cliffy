// Geometric Algebra Compute Shaders for Cliffy
// WebGPU implementation for massive parallel computation

// Multivector representation - 8 coefficients for Cl(3,0)
struct Multivector {
    coeffs: array<f32, 8>,
}

// Buffer bindings
@group(0) @binding(0) var<storage, read> input_a: array<Multivector>;
@group(0) @binding(1) var<storage, read> input_b: array<Multivector>;
@group(0) @binding(2) var<storage, read_write> output: array<Multivector>;

// Geometric product lookup table for basis elements
// Cl(3,0): 1, e1, e2, e12, e3, e13, e23, e123
var<private> gp_table: array<array<i32, 8>, 8> = array<array<i32, 8>, 8>(
    array<i32, 8>( 0,  1,  2,  3,  4,  5,  6,  7), // 1 * ...
    array<i32, 8>( 1,  0,  3, -2,  5, -4, -7,  6), // e1 * ...
    array<i32, 8>( 2, -3,  0,  1,  6,  7, -4, -5), // e2 * ...
    array<i32, 8>( 3,  2, -1,  0,  7, -6,  5, -4), // e12 * ...
    array<i32, 8>( 4, -5, -6, -7,  0,  1,  2,  3), // e3 * ...
    array<i32, 8>( 5,  4,  7, -6, -1,  0, -3,  2), // e13 * ...
    array<i32, 8>( 6, -7,  4,  5, -2,  3,  0, -1), // e23 * ...
    array<i32, 8>( 7,  6,  5,  4, -3, -2,  1,  0)  // e123 * ...
);

// Sign table for geometric product
var<private> gp_signs: array<array<f32, 8>, 8> = array<array<f32, 8>, 8>(
    array<f32, 8>( 1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0),
    array<f32, 8>( 1.0,  1.0,  1.0, -1.0,  1.0, -1.0, -1.0,  1.0),
    array<f32, 8>( 1.0, -1.0,  1.0,  1.0,  1.0,  1.0, -1.0, -1.0),
    array<f32, 8>( 1.0,  1.0, -1.0,  1.0,  1.0, -1.0,  1.0, -1.0),
    array<f32, 8>( 1.0, -1.0, -1.0, -1.0,  1.0,  1.0,  1.0,  1.0),
    array<f32, 8>( 1.0,  1.0,  1.0, -1.0, -1.0,  1.0, -1.0,  1.0),
    array<f32, 8>( 1.0, -1.0,  1.0,  1.0, -1.0,  1.0,  1.0, -1.0),
    array<f32, 8>( 1.0,  1.0,  1.0,  1.0, -1.0, -1.0,  1.0,  1.0)
);

// Compute geometric product of two multivectors
fn geometric_product(a: Multivector, b: Multivector) -> Multivector {
    var result = Multivector();
    
    for (var i = 0u; i < 8u; i++) {
        for (var j = 0u; j < 8u; j++) {
            let basis_result = gp_table[i][j];
            let sign = gp_signs[i][j];
            
            if (basis_result >= 0) {
                result.coeffs[basis_result] += a.coeffs[i] * b.coeffs[j] * sign;
            } else {
                result.coeffs[-basis_result] -= a.coeffs[i] * b.coeffs[j] * sign;
            }
        }
    }
    
    return result;
}

// Addition of multivectors
fn add_multivectors(a: Multivector, b: Multivector) -> Multivector {
    var result = Multivector();
    for (var i = 0u; i < 8u; i++) {
        result.coeffs[i] = a.coeffs[i] + b.coeffs[i];
    }
    return result;
}

// Scalar multiplication
fn scale_multivector(a: Multivector, scalar: f32) -> Multivector {
    var result = Multivector();
    for (var i = 0u; i < 8u; i++) {
        result.coeffs[i] = a.coeffs[i] * scalar;
    }
    return result;
}

// Multivector magnitude squared
fn magnitude_squared(a: Multivector) -> f32 {
    var sum = 0.0;
    for (var i = 0u; i < 8u; i++) {
        sum += a.coeffs[i] * a.coeffs[i];
    }
    return sum;
}

// Multivector conjugate (reverse)
fn conjugate(a: Multivector) -> Multivector {
    var result = a;
    result.coeffs[3] = -result.coeffs[3];  // e12
    result.coeffs[5] = -result.coeffs[5];  // e13  
    result.coeffs[6] = -result.coeffs[6];  // e23
    return result;
}

// Exponential map approximation (truncated series)
fn exp_multivector(a: Multivector) -> Multivector {
    var result = Multivector();
    result.coeffs[0] = 1.0; // Start with 1
    
    var term = a;
    var factorial = 1.0;
    
    // Truncated series expansion
    for (var n = 1u; n < 10u; n++) {
        factorial *= f32(n);
        let scaled_term = scale_multivector(term, 1.0 / factorial);
        result = add_multivectors(result, scaled_term);
        term = geometric_product(term, a);
    }
    
    return result;
}

// Sandwich product: R * x * ~R
fn sandwich(rotor: Multivector, x: Multivector) -> Multivector {
    let rotor_conj = conjugate(rotor);
    let temp = geometric_product(rotor, x);
    return geometric_product(temp, rotor_conj);
}

// Spherical linear interpolation for rotors
fn rotor_slerp(a: Multivector, b: Multivector, t: f32) -> Multivector {
    // Compute relative rotor: b * ~a
    let a_conj = conjugate(a);
    let relative = geometric_product(b, a_conj);
    
    // Take logarithm, scale by t, then exponentiate
    // Simplified approximation for small angles
    let log_relative = scale_multivector(relative, 1.0);
    let scaled_log = scale_multivector(log_relative, t);
    let interpolated_relative = exp_multivector(scaled_log);
    
    // Apply to original rotor
    return geometric_product(a, interpolated_relative);
}

// Main compute kernel for geometric product
@compute @workgroup_size(64, 1, 1)
fn geometric_product_kernel(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    if (index >= arrayLength(&input_a)) {
        return;
    }
    
    output[index] = geometric_product(input_a[index], input_b[index]);
}

// Compute kernel for addition
@compute @workgroup_size(64, 1, 1)
fn addition_kernel(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    if (index >= arrayLength(&input_a)) {
        return;
    }
    
    output[index] = add_multivectors(input_a[index], input_b[index]);
}

// Compute kernel for sandwich product
@compute @workgroup_size(64, 1, 1)
fn sandwich_kernel(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    if (index >= arrayLength(&input_a)) {
        return;
    }
    
    output[index] = sandwich(input_a[index], input_b[index]);
}

// Compute kernel for exponential map
@compute @workgroup_size(64, 1, 1)
fn exp_kernel(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    if (index >= arrayLength(&input_a)) {
        return;
    }
    
    output[index] = exp_multivector(input_a[index]);
}

// Compute kernel for rotor interpolation
@compute @workgroup_size(64, 1, 1)
fn rotor_slerp_kernel(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    if (index >= arrayLength(&input_a)) {
        return;
    }
    
    // Parameter t stored in first coefficient of input_b
    let t = input_b[index].coeffs[0];
    output[index] = rotor_slerp(input_a[index], input_b[index], t);
}

// Reduction kernel for parallel sum
var<workgroup> sdata: array<Multivector, 64>;

@compute @workgroup_size(64, 1, 1)
fn reduction_sum_kernel(@builtin(global_invocation_id) global_id: vec3<u32>,
                        @builtin(local_invocation_id) local_id: vec3<u32>) {
    let tid = local_id.x;
    let i = global_id.x;
    
    if (i < arrayLength(&input_a)) {
        sdata[tid] = input_a[i];
    } else {
        sdata[tid] = Multivector(); // Zero
    }
    
    workgroupBarrier();
    
    // Parallel reduction
    var s = 32u;
    while (s > 0u) {
        if (tid < s) {
            sdata[tid] = add_multivectors(sdata[tid], sdata[tid + s]);
        }
        workgroupBarrier();
        s >>= 1u;
    }
    
    if (tid == 0u) {
        output[global_id.x / 64u] = sdata[0];
    }
}