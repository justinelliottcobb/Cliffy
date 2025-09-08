-- | Foreign function interface for WASM bindings
module Cliffy.Foreign
  ( multivectorFromCoeffs
  , multivectorToCoeffs
  , geometricProductWasm
  , sandwichWasm
  , expWasm
  , logWasm
  , magnitudeWasm
  , createBehaviorWasm
  , updateBehaviorWasm
  , sampleBehaviorWasm
  ) where

import Prelude

import Data.Function.Uncurried (Fn1, Fn2, Fn3, runFn1, runFn2, runFn3)
import Effect (Effect)
import Effect.Uncurried (EffectFn1, EffectFn2, EffectFn3, runEffectFn1, runEffectFn2, runEffectFn3)

import Cliffy (MultivectorWasm, GeometricBehaviorWasm)

-- | Foreign imports for WASM multivector operations
foreign import multivectorFromCoeffs :: Fn1 (Array Number) MultivectorWasm

foreign import multivectorToCoeffs :: Fn1 MultivectorWasm (Array Number)

foreign import geometricProductWasm :: Fn2 MultivectorWasm MultivectorWasm MultivectorWasm

foreign import addWasm :: Fn2 MultivectorWasm MultivectorWasm MultivectorWasm

foreign import subtractWasm :: Fn2 MultivectorWasm MultivectorWasm MultivectorWasm

foreign import scaleWasm :: Fn2 Number MultivectorWasm MultivectorWasm

foreign import magnitudeWasm :: Fn1 MultivectorWasm Number

foreign import normalizeWasm :: Fn1 MultivectorWasm MultivectorWasm

foreign import expWasm :: Fn1 MultivectorWasm MultivectorWasm

foreign import logWasm :: Fn1 MultivectorWasm MultivectorWasm

foreign import sandwichWasm :: Fn2 MultivectorWasm MultivectorWasm MultivectorWasm

foreign import conjugateWasm :: Fn1 MultivectorWasm MultivectorWasm

foreign import gradeProjectionWasm :: Fn2 Int MultivectorWasm MultivectorWasm

-- | Foreign imports for geometric behaviors
foreign import createBehaviorWasm :: Fn1 MultivectorWasm GeometricBehaviorWasm

foreign import updateBehaviorWasm :: Fn2 GeometricBehaviorWasm MultivectorWasm (Effect Unit)

foreign import sampleBehaviorWasm :: Fn1 GeometricBehaviorWasm MultivectorWasm

foreign import transformBehaviorWasm :: Fn2 GeometricBehaviorWasm (MultivectorWasm -> MultivectorWasm) GeometricBehaviorWasm

-- | Helper functions to wrap foreign calls
fromCoeffs :: Array Number -> MultivectorWasm
fromCoeffs = runFn1 multivectorFromCoeffs

toCoeffs :: MultivectorWasm -> Array Number
toCoeffs = runFn1 multivectorToCoeffs

geometricProduct :: MultivectorWasm -> MultivectorWasm -> MultivectorWasm
geometricProduct = runFn2 geometricProductWasm

add :: MultivectorWasm -> MultivectorWasm -> MultivectorWasm
add = runFn2 addWasm

subtract :: MultivectorWasm -> MultivectorWasm -> MultivectorWasm  
subtract = runFn2 subtractWasm

scale :: Number -> MultivectorWasm -> MultivectorWasm
scale = runFn2 scaleWasm

magnitude :: MultivectorWasm -> Number
magnitude = runFn1 magnitudeWasm

normalize :: MultivectorWasm -> MultivectorWasm
normalize = runFn1 normalizeWasm

exp :: MultivectorWasm -> MultivectorWasm
exp = runFn1 expWasm

log :: MultivectorWasm -> MultivectorWasm  
log = runFn1 logWasm

sandwich :: MultivectorWasm -> MultivectorWasm -> MultivectorWasm
sandwich = runFn2 sandwichWasm

conjugate :: MultivectorWasm -> MultivectorWasm
conjugate = runFn1 conjugateWasm

gradeProjection :: Int -> MultivectorWasm -> MultivectorWasm
gradeProjection = runFn2 gradeProjectionWasm

-- | Behavior operations
createBehavior :: MultivectorWasm -> GeometricBehaviorWasm
createBehavior = runFn1 createBehaviorWasm

updateBehavior :: GeometricBehaviorWasm -> MultivectorWasm -> Effect Unit
updateBehavior = runEffectFn2 updateBehaviorWasm

sampleBehavior :: GeometricBehaviorWasm -> MultivectorWasm
sampleBehavior = runFn1 sampleBehaviorWasm

transformBehavior :: GeometricBehaviorWasm -> (MultivectorWasm -> MultivectorWasm) -> GeometricBehaviorWasm
transformBehavior = runFn2 transformBehaviorWasm