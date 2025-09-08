-- | Main Cliffy module for PureScript bindings
-- | Provides functional geometric algebra operations
module Cliffy
  ( class GeometricAlgebra
  , Multivector(..)
  , GeometricBehavior(..)
  , transform
  , geometricProduct
  , sandwich
  , exp
  , log
  , scale
  , magnitude
  , gradeProjection
  , createScalar
  , createE1
  , createE2 
  , createE3
  , createRotor
  , interpolateRotors
  , module Cliffy.Types
  ) where

import Prelude

import Data.Array (range, zipWith)
import Data.Foldable (sum, foldl)
import Data.Maybe (Maybe(..))
import Data.Number (cos, sin, sqrt, atan2)
import Effect (Effect)
import Effect.Uncurried (EffectFn1, EffectFn2, EffectFn3, runEffectFn1, runEffectFn2, runEffectFn3)
import Math (pi)

import Cliffy.Types (CliffySignature(..), Cl30, Cl41, Cl44)

-- | Foreign data types for WASM bindings
foreign import data MultivectorWasm :: Type
foreign import data GeometricBehaviorWasm :: Type

-- | Multivector representation in PureScript
newtype Multivector = Multivector
  { coefficients :: Array Number
  , signature :: CliffySignature
  }

-- | Geometric Behavior for reactive programming
newtype GeometricBehavior = GeometricBehavior
  { current :: Multivector
  , wasm :: Maybe GeometricBehaviorWasm
  }

-- | Type class for geometric algebra operations
class GeometricAlgebra a where
  geometricProduct :: a -> a -> a
  add :: a -> a -> a
  scale :: Number -> a -> a
  magnitude :: a -> Number
  conjugate :: a -> a

-- | Instance of GeometricAlgebra for Multivector
instance geometricAlgebraMultivector :: GeometricAlgebra Multivector where
  geometricProduct (Multivector mv1) (Multivector mv2) = 
    case mv1.signature, mv2.signature of
      Cl30, Cl30 -> geometricProductCl30 mv1.coefficients mv2.coefficients
      _, _ -> Multivector { coefficients: [], signature: Cl30 }
  
  add (Multivector mv1) (Multivector mv2) = Multivector
    { coefficients: zipWith (+) mv1.coefficients mv2.coefficients
    , signature: mv1.signature
    }
  
  scale scalar (Multivector mv) = Multivector
    { coefficients: map (_ * scalar) mv.coefficients
    , signature: mv.signature
    }
  
  magnitude (Multivector mv) = 
    sqrt $ sum $ map (\x -> x * x) mv.coefficients
  
  conjugate (Multivector mv) = Multivector
    { coefficients: conjugateCoefficients mv.coefficients
    , signature: mv.signature
    }

-- | Geometric product for Cl(3,0) - 3D Euclidean space
geometricProductCl30 :: Array Number -> Array Number -> Multivector
geometricProductCl30 a b = Multivector
  { coefficients: 
    [ -- scalar (1)
      a!!0 * b!!0 + a!!1 * b!!1 + a!!2 * b!!2 - a!!3 * b!!3 + a!!4 * b!!4 - a!!5 * b!!5 - a!!6 * b!!6 - a!!7 * b!!7
    , -- e1  
      a!!0 * b!!1 + a!!1 * b!!0 - a!!2 * b!!3 + a!!3 * b!!2 + a!!4 * b!!5 - a!!5 * b!!4 - a!!6 * b!!7 + a!!7 * b!!6
    , -- e2
      a!!0 * b!!2 + a!!1 * b!!3 + a!!2 * b!!0 - a!!3 * b!!1 - a!!4 * b!!6 - a!!5 * b!!7 + a!!6 * b!!4 + a!!7 * b!!5
    , -- e12
      a!!0 * b!!3 + a!!1 * b!!2 - a!!2 * b!!1 + a!!3 * b!!0 + a!!4 * b!!7 + a!!5 * b!!6 - a!!6 * b!!5 - a!!7 * b!!4
    , -- e3
      a!!0 * b!!4 - a!!1 * b!!5 + a!!2 * b!!6 + a!!3 * b!!7 + a!!4 * b!!0 + a!!5 * b!!1 - a!!6 * b!!2 - a!!7 * b!!3
    , -- e13
      a!!0 * b!!5 + a!!1 * b!!4 + a!!2 * b!!7 - a!!3 * b!!6 - a!!4 * b!!1 + a!!5 * b!!0 + a!!6 * b!!3 - a!!7 * b!!2
    , -- e23  
      a!!0 * b!!6 - a!!1 * b!!7 + a!!2 * b!!4 + a!!3 * b!!5 + a!!4 * b!!2 - a!!5 * b!!3 + a!!6 * b!!0 - a!!7 * b!!1
    , -- e123
      a!!0 * b!!7 + a!!1 * b!!6 + a!!2 * b!!5 + a!!3 * b!!4 + a!!4 * b!!3 + a!!5 * b!!2 + a!!6 * b!!1 + a!!7 * b!!0
    ]
  , signature: Cl30
  }
  where
    (!!!) = flip unsafeIndex
    infixl 8 !!!

-- | Helper function for array indexing with default
unsafeIndex :: Array Number -> Int -> Number
unsafeIndex arr i = case arr !! i of
  Just x -> x
  Nothing -> 0.0

-- | Conjugate coefficients (reverse operation)
conjugateCoefficients :: Array Number -> Array Number
conjugateCoefficients coeffs = case coeffs of
  [s, e1, e2, e12, e3, e13, e23, e123] -> 
    [s, e1, e2, (-e12), e3, (-e13), (-e23), (-e123)]
  _ -> coeffs

-- | Create a scalar multivector
createScalar :: Number -> Multivector
createScalar x = Multivector 
  { coefficients: [x, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
  , signature: Cl30
  }

-- | Create e1 basis vector
createE1 :: Multivector 
createE1 = Multivector
  { coefficients: [0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
  , signature: Cl30
  }

-- | Create e2 basis vector
createE2 :: Multivector
createE2 = Multivector
  { coefficients: [0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0]
  , signature: Cl30
  }

-- | Create e3 basis vector  
createE3 :: Multivector
createE3 = Multivector
  { coefficients: [0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0]
  , signature: Cl30
  }

-- | Sandwich product: R * x * ~R
sandwich :: Multivector -> Multivector -> Multivector
sandwich rotor x = 
  let rotorConj = conjugate rotor
      temp = geometricProduct rotor x
  in geometricProduct temp rotorConj

-- | Exponential map (simplified approximation)
exp :: Multivector -> Multivector
exp (Multivector mv) = 
  let scalarPart = case mv.coefficients !! 0 of
        Just s -> s
        Nothing -> 0.0
      bivectorPart = Multivector 
        { coefficients: [0.0] <> (drop 1 mv.coefficients)
        , signature: mv.signature
        }
      bivectorMagnitude = magnitude bivectorPart
  in if bivectorMagnitude < 0.000001
     then createScalar (Math.exp scalarPart)
     else let cosVal = cos bivectorMagnitude
              sinVal = sin bivectorMagnitude  
              scaledBivector = scale (sinVal / bivectorMagnitude) bivectorPart
          in scale (Math.exp scalarPart) $ add (createScalar cosVal) scaledBivector

-- | Logarithm (simplified approximation)  
log :: Multivector -> Multivector
log (Multivector mv) = 
  let scalarPart = case mv.coefficients !! 0 of
        Just s -> s  
        Nothing -> 0.0
      bivectorPart = Multivector
        { coefficients: [0.0] <> (drop 1 mv.coefficients)
        , signature: mv.signature
        }
      bivectorMagnitude = magnitude bivectorPart
      mvMagnitude = magnitude (Multivector mv)
  in if bivectorMagnitude < 0.000001
     then createScalar (Math.log mvMagnitude)
     else let angle = atan2 bivectorMagnitude scalarPart
              logMagnitude = Math.log mvMagnitude
              scaledBivector = scale (angle / bivectorMagnitude) bivectorPart
          in add (createScalar logMagnitude) scaledBivector

-- | Grade projection
gradeProjection :: Int -> Multivector -> Multivector
gradeProjection grade (Multivector mv) = Multivector
  { coefficients: gradeProjectCoeffs grade mv.coefficients
  , signature: mv.signature
  }
  where
    gradeProjectCoeffs :: Int -> Array Number -> Array Number
    gradeProjectCoeffs g coeffs = case g of
      0 -> [coeffs !! 0 # fromMaybe 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0] -- scalar
      1 -> [0.0, coeffs !! 1 # fromMaybe 0.0, coeffs !! 2 # fromMaybe 0.0, 0.0, coeffs !! 4 # fromMaybe 0.0, 0.0, 0.0, 0.0] -- vector
      2 -> [0.0, 0.0, 0.0, coeffs !! 3 # fromMaybe 0.0, 0.0, coeffs !! 5 # fromMaybe 0.0, coeffs !! 6 # fromMaybe 0.0, 0.0] -- bivector
      3 -> [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, coeffs !! 7 # fromMaybe 0.0] -- trivector
      _ -> [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]

-- | Create rotor from angle and bivector
createRotor :: Number -> Multivector -> Multivector
createRotor angle bivector =
  let halfAngle = angle / 2.0
      cosHalf = cos halfAngle
      sinHalf = sin halfAngle
      normalizedBivector = scale (1.0 / magnitude bivector) bivector
  in add (createScalar cosHalf) (scale sinHalf normalizedBivector)

-- | Spherical linear interpolation for rotors
interpolateRotors :: Number -> Multivector -> Multivector -> Multivector
interpolateRotors t rotor1 rotor2 =
  let diff = geometricProduct rotor2 (conjugate rotor1)
      logDiff = log diff
      scaledLog = scale t logDiff
      interpolatedRotor = exp scaledLog
  in geometricProduct rotor1 interpolatedRotor

-- | Behavior transformation function
transform :: (Multivector -> Multivector) -> GeometricBehavior -> GeometricBehavior
transform f (GeometricBehavior behavior) = GeometricBehavior
  { current: f behavior.current
  , wasm: behavior.wasm
  }

-- | Sample current value from behavior
sample :: GeometricBehavior -> Multivector  
sample (GeometricBehavior behavior) = behavior.current

-- | Create constant behavior
constant :: Multivector -> GeometricBehavior
constant mv = GeometricBehavior
  { current: mv
  , wasm: Nothing
  }

-- | Update behavior with new value
update :: Multivector -> GeometricBehavior -> GeometricBehavior
update newValue (GeometricBehavior behavior) = GeometricBehavior
  { current: newValue
  , wasm: behavior.wasm  
  }

-- | Combine two behaviors
combine :: (Multivector -> Multivector -> Multivector) -> GeometricBehavior -> GeometricBehavior -> GeometricBehavior
combine f (GeometricBehavior b1) (GeometricBehavior b2) = GeometricBehavior
  { current: f b1.current b2.current
  , wasm: Nothing
  }

-- | Apply rotor transformation to behavior
withRotor :: GeometricBehavior -> GeometricBehavior -> GeometricBehavior  
withRotor = combine sandwich