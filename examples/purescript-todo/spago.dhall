{-
PureScript Todo Example for Cliffy
Demonstrates list state management and complex derived values
-}
{ name = "purescript-todo-example"
, dependencies =
  [ "arrays"
  , "console"
  , "effect"
  , "foldable-traversable"
  , "integers"
  , "maybe"
  , "prelude"
  , "refs"
  , "strings"
  , "web-dom"
  , "web-events"
  , "web-html"
  ]
, packages = ./packages.dhall
, sources = [ "src/**/*.purs" ]
}
