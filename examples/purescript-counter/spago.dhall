{-
PureScript Counter Example for Cliffy
Demonstrates Behavior-based reactive state with DOM rendering
-}
{ name = "purescript-counter-example"
, dependencies =
  [ "console"
  , "effect"
  , "prelude"
  , "refs"
  , "web-dom"
  , "web-events"
  , "web-html"
  ]
, packages = ./packages.dhall
, sources = [ "src/**/*.purs" ]
}
