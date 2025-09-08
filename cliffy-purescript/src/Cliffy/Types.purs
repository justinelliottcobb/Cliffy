-- | Type definitions for Cliffy geometric algebra
module Cliffy.Types
  ( CliffySignature(..)
  , Cl30
  , Cl41
  , Cl44
  , BasisElement(..)
  , Grade
  , Coefficient
  , GeometricProduct
  , OuterProduct
  , InnerProduct
  , CommutatorProduct
  , AnticommutatorProduct
  ) where

import Prelude

-- | Clifford algebra signatures
data CliffySignature 
  = Cl30  -- 3D Euclidean
  | Cl41  -- Conformal Geometric Algebra
  | Cl44  -- Spacetime algebra

instance showCliffySignature :: Show CliffySignature where
  show Cl30 = "Cl(3,0)"
  show Cl41 = "Cl(4,1)"
  show Cl44 = "Cl(4,4)"

instance eqCliffySignature :: Eq CliffySignature where
  eq Cl30 Cl30 = true
  eq Cl41 Cl41 = true
  eq Cl44 Cl44 = true
  eq _ _ = false

-- | Type aliases for specific signatures
type Cl30 = Unit  -- Phantom type for Cl(3,0)
type Cl41 = Unit  -- Phantom type for Cl(4,1)
type Cl44 = Unit  -- Phantom type for Cl(4,4)

-- | Basis element representation
data BasisElement = BasisElement Int String

instance showBasisElement :: Show BasisElement where
  show (BasisElement _ name) = name

instance eqBasisElement :: Eq BasisElement where
  eq (BasisElement i1 _) (BasisElement i2 _) = i1 == i2

-- | Grade of a basis element (number of vectors in the product)
type Grade = Int

-- | Coefficient of a basis element
type Coefficient = Number

-- | Type aliases for different products
type GeometricProduct = Number -> Number -> Number
type OuterProduct = Number -> Number -> Number  
type InnerProduct = Number -> Number -> Number
type CommutatorProduct = Number -> Number -> Number
type AnticommutatorProduct = Number -> Number -> Number

-- | Basis elements for Cl(3,0)
e0 :: BasisElement
e0 = BasisElement 0 "1"

e1 :: BasisElement  
e1 = BasisElement 1 "e1"

e2 :: BasisElement
e2 = BasisElement 2 "e2"

e12 :: BasisElement
e12 = BasisElement 3 "e12"

e3 :: BasisElement
e3 = BasisElement 4 "e3"

e13 :: BasisElement
e13 = BasisElement 5 "e13"

e23 :: BasisElement
e23 = BasisElement 6 "e23"

e123 :: BasisElement
e123 = BasisElement 7 "e123"