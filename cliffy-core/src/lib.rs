use nalgebra::SVector;
use num_traits::{Float, Zero, One};
use serde::{Deserialize, Serialize};
use std::ops::{Add, Mul, Sub};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Multivector<T: Float, const N: usize> {
    pub coeffs: SVector<T, N>,
}

pub type Cl3_0<T> = Multivector<T, 8>;   // 3D Euclidean: 1 + 3 + 3 + 1 = 8 basis elements
pub type Cl4_1<T> = Multivector<T, 32>;  // Conformal: 2^5 = 32 basis elements  
pub type Cl4_4<T> = Multivector<T, 256>; // Spacetime: 2^8 = 256 basis elements

impl<T: Float, const N: usize> Multivector<T, N> {
    pub fn new(coeffs: SVector<T, N>) -> Self {
        Self { coeffs }
    }

    pub fn zero() -> Self {
        Self {
            coeffs: SVector::zeros(),
        }
    }

    pub fn scalar(value: T) -> Self {
        let mut coeffs = SVector::zeros();
        coeffs[0] = value;
        Self { coeffs }
    }

    pub fn geometric_product(&self, other: &Self) -> Self {
        let mut result = Self::zero();
        
        for i in 0..N {
            for j in 0..N {
                let coeff = self.coeffs[i] * other.coeffs[j];
                let (k, sign) = geometric_product_table(i, j);
                if k < N {
                    result.coeffs[k] = result.coeffs[k] + coeff * T::from(sign).unwrap();
                }
            }
        }
        
        result
    }

    pub fn sandwich(&self, x: &Self) -> Self {
        let conjugate = self.conjugate();
        self.geometric_product(x).geometric_product(&conjugate)
    }

    pub fn conjugate(&self) -> Self {
        let mut result = self.clone();
        
        for i in 1..N {
            if grade_of_basis(i) % 2 == 1 {
                result.coeffs[i] = -result.coeffs[i];
            }
        }
        
        result
    }

    pub fn exp(&self) -> Self {
        let mut result = Self::scalar(T::one());
        let mut term = self.clone();
        let mut factorial = T::one();

        for n in 1..20 {
            factorial = factorial * T::from(n).unwrap();
            result = result + term.scale(T::one() / factorial);
            term = term.geometric_product(self);
        }

        result
    }

    pub fn log(&self) -> Self {
        let scalar_part = self.coeffs[0];
        let vector_part = self.grade_projection(1);
        
        let magnitude = scalar_part * scalar_part + vector_part.magnitude_squared();
        let log_magnitude = magnitude.sqrt().ln();
        
        if vector_part.is_zero() {
            Self::scalar(log_magnitude)
        } else {
            let angle = (vector_part.magnitude() / scalar_part).atan();
            Self::scalar(log_magnitude) + vector_part.normalize().scale(angle)
        }
    }

    pub fn grade_projection(&self, grade: usize) -> Self {
        let mut result = Self::zero();
        
        for i in 0..N {
            if grade_of_basis(i) == grade {
                result.coeffs[i] = self.coeffs[i];
            }
        }
        
        result
    }

    pub fn magnitude_squared(&self) -> T {
        self.coeffs.iter().map(|&x| x * x).fold(T::zero(), |acc, x| acc + x)
    }

    pub fn magnitude(&self) -> T {
        self.magnitude_squared().sqrt()
    }

    pub fn normalize(&self) -> Self {
        let mag = self.magnitude();
        if mag > T::zero() {
            self.scale(T::one() / mag)
        } else {
            self.clone()
        }
    }

    pub fn scale(&self, scalar: T) -> Self {
        Self {
            coeffs: self.coeffs * scalar,
        }
    }

    pub fn is_zero(&self) -> bool {
        self.coeffs.iter().all(|&x| x == T::zero())
    }
}

impl<T: Float, const N: usize> Add for Multivector<T, N> {
    type Output = Self;

    fn add(self, other: Self) -> Self::Output {
        Self {
            coeffs: self.coeffs + other.coeffs,
        }
    }
}

impl<T: Float, const N: usize> Sub for Multivector<T, N> {
    type Output = Self;

    fn sub(self, other: Self) -> Self::Output {
        Self {
            coeffs: self.coeffs - other.coeffs,
        }
    }
}

impl<T: Float, const N: usize> Mul<T> for Multivector<T, N> {
    type Output = Self;

    fn mul(self, scalar: T) -> Self::Output {
        self.scale(scalar)
    }
}

fn geometric_product_table(i: usize, j: usize) -> (usize, i8) {
    let basis_i = i;
    let basis_j = j;
    let result_basis = basis_i ^ basis_j;
    
    let sign = if count_swaps(basis_i, basis_j) % 2 == 0 { 1 } else { -1 };
    
    (result_basis, sign)
}

fn count_swaps(a: usize, b: usize) -> usize {
    let mut count = 0;
    for i in 0..8 {
        if (a >> i) & 1 == 1 {
            for j in 0..i {
                if (b >> j) & 1 == 1 {
                    count += 1;
                }
            }
        }
    }
    count
}

fn grade_of_basis(basis: usize) -> usize {
    basis.count_ones() as usize
}

pub mod cl3_0 {
    use super::*;

    pub type Multivector3D<T> = Cl3_0<T>;

    pub fn e1<T: Float>() -> Multivector3D<T> {
        let mut coeffs = SVector::zeros();
        coeffs[1] = T::one();
        Multivector3D::new(coeffs)
    }

    pub fn e2<T: Float>() -> Multivector3D<T> {
        let mut coeffs = SVector::zeros();
        coeffs[2] = T::one();
        Multivector3D::new(coeffs)
    }

    pub fn e3<T: Float>() -> Multivector3D<T> {
        let mut coeffs = SVector::zeros();
        coeffs[4] = T::one();
        Multivector3D::new(coeffs)
    }

    pub fn rotor<T: Float>(angle: T, bivector: &Multivector3D<T>) -> Multivector3D<T> {
        let half_angle = angle / T::from(2.0).unwrap();
        let cos_half = half_angle.cos();
        let sin_half = half_angle.sin();
        
        Multivector3D::scalar(cos_half) + bivector.normalize().scale(sin_half)
    }
}

pub mod cl4_1 {
    use super::*;

    pub type ConformalMultivector<T> = Cl4_1<T>;

    pub fn einf<T: Float>() -> ConformalMultivector<T> {
        let mut coeffs = SVector::zeros();
        coeffs[16] = T::one();
        ConformalMultivector::new(coeffs)
    }

    pub fn e0<T: Float>() -> ConformalMultivector<T> {
        let mut coeffs = SVector::zeros();
        coeffs[8] = T::one();
        ConformalMultivector::new(coeffs)
    }

    pub fn point<T: Float>(x: T, y: T, z: T) -> ConformalMultivector<T> {
        let e1 = cl3_0::e1::<T>();
        let e2 = cl3_0::e2::<T>();
        let e3 = cl3_0::e3::<T>();
        let einf = self::einf::<T>();
        let e0 = self::e0::<T>();

        let point_3d = e1.scale(x) + e2.scale(y) + e3.scale(z);
        let radius_squared = x * x + y * y + z * z;
        
        point_3d + e0 + einf.scale(radius_squared / T::from(2.0).unwrap())
    }
}

pub mod cl4_4 {
    use super::*;

    pub type SpacetimeMultivector<T> = Cl4_4<T>;

    pub fn spacetime_interval<T: Float>(
        t: T, x: T, y: T, z: T
    ) -> SpacetimeMultivector<T> {
        let mut coeffs = SVector::zeros();
        coeffs[0] = t * t - x * x - y * y - z * z;
        SpacetimeMultivector::new(coeffs)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use super::cl3_0::*;

    #[test]
    fn test_geometric_product_associativity() {
        let a = Multivector3D::scalar(2.0);
        let b = e1::<f64>();
        let c = e2::<f64>();

        let left = (a.geometric_product(&b)).geometric_product(&c);
        let right = a.geometric_product(&(b.geometric_product(&c)));

        assert!((left.coeffs - right.coeffs).magnitude() < 1e-10);
    }

    #[test]
    fn test_rotor_exp() {
        let bivector = e1::<f64>().geometric_product(&e2::<f64>());
        let angle = std::f64::consts::PI / 4.0;
        
        let rotor1 = rotor(angle, &bivector);
        let rotor2 = bivector.scale(-angle / 2.0).exp();

        assert!((rotor1.coeffs - rotor2.coeffs).magnitude() < 1e-10);
    }

    #[test]
    fn test_magnitude() {
        let v = e1::<f64>() + e2::<f64>() + e3::<f64>();
        assert!((v.magnitude() - 3.0f64.sqrt()).abs() < 1e-10);
    }
}