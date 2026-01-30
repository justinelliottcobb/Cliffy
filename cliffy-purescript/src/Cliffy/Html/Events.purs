-- | Type-safe event handlers for Cliffy's Algebraic TSX
-- |
-- | Event handlers integrate with Cliffy's Event type for FRP-style
-- | event handling.
-- |
-- | ```purescript
-- | clicks <- event
-- | count <- clicks # fold 0 \n _ -> n + 1
-- |
-- | button [ onClick \_ -> emit clicks unit ]
-- |     [ text "Click me" ]
-- | ```
module Cliffy.Html.Events
  ( -- * Mouse events
    onClick
  , onDoubleClick
  , onMouseDown
  , onMouseUp
  , onMouseEnter
  , onMouseLeave
  , onMouseMove
  , onMouseOver
  , onMouseOut

    -- * Keyboard events
  , onKeyDown
  , onKeyUp
  , onKeyPress

    -- * Form events
  , onChange
  , onInput
  , onSubmit
  , onFocus
  , onBlur

    -- * Other events
  , onScroll
  , onLoad
  , onError

    -- * Event types (for type-safe handlers)
  , MouseEvent
  , KeyboardEvent
  , InputEvent
  , FocusEvent
  , SubmitEvent

    -- * Event helpers
  , preventDefault
  , stopPropagation
  , targetValue
  , targetChecked
  ) where

import Prelude

import Effect (Effect)
import Effect.Uncurried (EffectFn2)

import Cliffy.Html.Attributes (Prop)

-- | Mouse event type
foreign import data MouseEvent :: Type

-- | Keyboard event type
foreign import data KeyboardEvent :: Type

-- | Input event type
foreign import data InputEvent :: Type

-- | Focus event type
foreign import data FocusEvent :: Type

-- | Submit event type
foreign import data SubmitEvent :: Type

-- Foreign implementations
foreign import mkEventPropImpl :: forall e. EffectFn2 String (e -> Effect Unit) Prop
foreign import runEffectFn2Sync :: forall a b c. EffectFn2 a b c -> a -> b -> c

-- | Click event handler
onClick :: (MouseEvent -> Effect Unit) -> Prop
onClick handler = runEffectFn2Sync mkEventPropImpl "click" handler

-- | Double-click event handler
onDoubleClick :: (MouseEvent -> Effect Unit) -> Prop
onDoubleClick handler = runEffectFn2Sync mkEventPropImpl "dblclick" handler

-- | Mouse down event handler
onMouseDown :: (MouseEvent -> Effect Unit) -> Prop
onMouseDown handler = runEffectFn2Sync mkEventPropImpl "mousedown" handler

-- | Mouse up event handler
onMouseUp :: (MouseEvent -> Effect Unit) -> Prop
onMouseUp handler = runEffectFn2Sync mkEventPropImpl "mouseup" handler

-- | Mouse enter event handler
onMouseEnter :: (MouseEvent -> Effect Unit) -> Prop
onMouseEnter handler = runEffectFn2Sync mkEventPropImpl "mouseenter" handler

-- | Mouse leave event handler
onMouseLeave :: (MouseEvent -> Effect Unit) -> Prop
onMouseLeave handler = runEffectFn2Sync mkEventPropImpl "mouseleave" handler

-- | Mouse move event handler
onMouseMove :: (MouseEvent -> Effect Unit) -> Prop
onMouseMove handler = runEffectFn2Sync mkEventPropImpl "mousemove" handler

-- | Mouse over event handler
onMouseOver :: (MouseEvent -> Effect Unit) -> Prop
onMouseOver handler = runEffectFn2Sync mkEventPropImpl "mouseover" handler

-- | Mouse out event handler
onMouseOut :: (MouseEvent -> Effect Unit) -> Prop
onMouseOut handler = runEffectFn2Sync mkEventPropImpl "mouseout" handler

-- | Key down event handler
onKeyDown :: (KeyboardEvent -> Effect Unit) -> Prop
onKeyDown handler = runEffectFn2Sync mkEventPropImpl "keydown" handler

-- | Key up event handler
onKeyUp :: (KeyboardEvent -> Effect Unit) -> Prop
onKeyUp handler = runEffectFn2Sync mkEventPropImpl "keyup" handler

-- | Key press event handler (deprecated in browsers, but still useful)
onKeyPress :: (KeyboardEvent -> Effect Unit) -> Prop
onKeyPress handler = runEffectFn2Sync mkEventPropImpl "keypress" handler

-- | Change event handler (for inputs, selects)
onChange :: (InputEvent -> Effect Unit) -> Prop
onChange handler = runEffectFn2Sync mkEventPropImpl "change" handler

-- | Input event handler (fires on every keystroke)
onInput :: (InputEvent -> Effect Unit) -> Prop
onInput handler = runEffectFn2Sync mkEventPropImpl "input" handler

-- | Form submit event handler
onSubmit :: (SubmitEvent -> Effect Unit) -> Prop
onSubmit handler = runEffectFn2Sync mkEventPropImpl "submit" handler

-- | Focus event handler
onFocus :: (FocusEvent -> Effect Unit) -> Prop
onFocus handler = runEffectFn2Sync mkEventPropImpl "focus" handler

-- | Blur event handler
onBlur :: (FocusEvent -> Effect Unit) -> Prop
onBlur handler = runEffectFn2Sync mkEventPropImpl "blur" handler

-- | Scroll event handler
onScroll :: forall e. (e -> Effect Unit) -> Prop
onScroll handler = runEffectFn2Sync mkEventPropImpl "scroll" handler

-- | Load event handler
onLoad :: forall e. (e -> Effect Unit) -> Prop
onLoad handler = runEffectFn2Sync mkEventPropImpl "load" handler

-- | Error event handler
onError :: forall e. (e -> Effect Unit) -> Prop
onError handler = runEffectFn2Sync mkEventPropImpl "error" handler

-- Event helpers

-- | Prevent the default browser action
foreign import preventDefault :: forall e. e -> Effect Unit

-- | Stop event propagation
foreign import stopPropagation :: forall e. e -> Effect Unit

-- | Get the value from an input event's target
foreign import targetValue :: InputEvent -> String

-- | Get the checked state from an input event's target
foreign import targetChecked :: InputEvent -> Boolean
