-- | Type-safe HTML attributes for Cliffy's Algebraic TSX
-- |
-- | Attributes can be static values or reactive Behaviors.
-- |
-- | ```purescript
-- | isActive <- behavior false
-- |
-- | div [ className "button"
-- |     , classWhen isActive "active"
-- |     , disabled isActive
-- |     ]
-- |     [ text "Click me" ]
-- | ```
module Cliffy.Html.Attributes
  ( Prop
  , PropValue

    -- * Static attributes
  , className
  , id
  , style
  , href
  , src
  , alt
  , type_
  , value
  , placeholder
  , disabled
  , checked
  , hidden
  , title
  , name
  , for
  , tabIndex
  , role
  , ariaLabel
  , dataAttr

    -- * Reactive attributes (Behavior-based)
  , classWhen
  , styleWhen
  , attrWhen
  , attr
  , attrBehavior

    -- * Style helpers
  , styleObj
  , styles
  ) where

import Prelude

import Data.Maybe (Maybe(..))
import Data.Tuple (Tuple(..))
import Effect.Uncurried (EffectFn2, EffectFn3)

-- | Property type for element attributes
foreign import data Prop :: Type

-- | Internal property value representation
foreign import data PropValue :: Type

-- Foreign implementations
foreign import mkPropImpl :: EffectFn2 String PropValue Prop
foreign import mkBehaviorPropImpl :: forall a. EffectFn3 String a (a -> PropValue) Prop
foreign import mkEventPropImpl :: forall e. EffectFn2 String (e -> Unit) Prop
foreign import stringToPropValue :: String -> PropValue
foreign import boolToPropValue :: Boolean -> PropValue
foreign import intToPropValue :: Int -> PropValue
foreign import numberToPropValue :: Number -> PropValue

-- Synchronous FFI helper
foreign import runEffectFn2Sync :: forall a b c. EffectFn2 a b c -> a -> b -> c
foreign import runEffectFn3Sync :: forall a b c d. EffectFn3 a b c d -> a -> b -> c -> d

-- | Create a property with a string value
attr :: String -> String -> Prop
attr name val = runEffectFn2Sync mkPropImpl name (stringToPropValue val)

-- | Create a property with a Behavior value
attrBehavior :: forall a. String -> a -> (a -> String) -> Prop
attrBehavior name initial toString =
    runEffectFn3Sync mkBehaviorPropImpl name initial (stringToPropValue <<< toString)

-- | CSS class name
className :: String -> Prop
className = attr "class"

-- | Conditional class - adds class when Behavior is true
classWhen :: forall a. a -> String -> Prop
classWhen condition cls =
    runEffectFn3Sync mkBehaviorPropImpl "class" condition
        (\b -> if unsafeCoerceToBoolean b then stringToPropValue cls else stringToPropValue "")

-- | Element ID
id :: String -> Prop
id = attr "id"

-- | Inline style (as a string)
style :: String -> Prop
style = attr "style"

-- | Conditional style
styleWhen :: forall a. a -> String -> Prop
styleWhen condition styleStr =
    runEffectFn3Sync mkBehaviorPropImpl "style" condition
        (\b -> if unsafeCoerceToBoolean b then stringToPropValue styleStr else stringToPropValue "")

-- | Style from key-value pairs
styles :: Array (Tuple String String) -> Prop
styles pairs = style $ formatStyles pairs
  where
    formatStyles :: Array (Tuple String String) -> String
    formatStyles = foldl (\acc (Tuple k v) -> acc <> k <> ": " <> v <> "; ") ""

-- | Style from a record-like object (JS interop)
foreign import styleObj :: forall r. Record r -> Prop

-- | Conditional attribute
attrWhen :: forall a. a -> String -> String -> Prop
attrWhen condition name val =
    runEffectFn3Sync mkBehaviorPropImpl name condition
        (\b -> if unsafeCoerceToBoolean b then stringToPropValue val else stringToPropValue "")

-- | Link href
href :: String -> Prop
href = attr "href"

-- | Image source
src :: String -> Prop
src = attr "src"

-- | Image alt text
alt :: String -> Prop
alt = attr "alt"

-- | Input type
type_ :: String -> Prop
type_ = attr "type"

-- | Input value
value :: String -> Prop
value = attr "value"

-- | Placeholder text
placeholder :: String -> Prop
placeholder = attr "placeholder"

-- | Disabled state (boolean attribute)
disabled :: Boolean -> Prop
disabled b = runEffectFn2Sync mkPropImpl "disabled" (boolToPropValue b)

-- | Checked state (boolean attribute)
checked :: Boolean -> Prop
checked b = runEffectFn2Sync mkPropImpl "checked" (boolToPropValue b)

-- | Hidden state (boolean attribute)
hidden :: Boolean -> Prop
hidden b = runEffectFn2Sync mkPropImpl "hidden" (boolToPropValue b)

-- | Title attribute
title :: String -> Prop
title = attr "title"

-- | Name attribute
name :: String -> Prop
name = attr "name"

-- | For attribute (label association)
for :: String -> Prop
for = attr "for"

-- | Tab index
tabIndex :: Int -> Prop
tabIndex n = runEffectFn2Sync mkPropImpl "tabindex" (intToPropValue n)

-- | ARIA role
role :: String -> Prop
role = attr "role"

-- | ARIA label
ariaLabel :: String -> Prop
ariaLabel = attr "aria-label"

-- | Data attribute
dataAttr :: String -> String -> Prop
dataAttr key = attr ("data-" <> key)

-- Internal helper
foreign import unsafeCoerceToBoolean :: forall a. a -> Boolean
foreign import foldl :: forall a b. (b -> a -> b) -> b -> Array a -> b
