{-
Welcome to a Spago project!
You can edit this file as you like.

To learn more about Spago, see:
https://github.com/purescript/spago
-}
{ name = "cliffy-purescript"
, dependencies =
  [ "arrays"
  , "console"
  , "effect"
  , "foldable-traversable"
  , "integers"
  , "math"
  , "maybe"
  , "newtype"
  , "numbers"
  , "prelude"
  , "psci-support"
  , "transformers"
  , "tuples"
  , "typelevel-prelude"
  , "web-promise"
  , "web-workers"
  ]
, packages = ./packages.dhall
, sources = [ "src/**/*.purs", "test/**/*.purs" ]
}