{-
Cliffy PureScript Counter Example

Demonstrates:
- Behavior pattern for reactive state (using Ref as the underlying mechanism)
- Pure functional state updates
- DOM updates through Effect
- Event handlers with callbacks
- Derived values (doubled count)
-}
module Main where

import Prelude

import Effect (Effect)
import Effect.Console (log)
import Effect.Ref (Ref)
import Effect.Ref as Ref
import Data.Maybe (Maybe(..))
import Web.DOM.Document (toNonElementParentNode)
import Web.DOM.Element (Element, setClassName, toEventTarget)
import Web.DOM.Element as Element
import Web.DOM.NonElementParentNode (getElementById)
import Web.DOM.Node (setTextContent)
import Web.Event.Event (EventType(..))
import Web.Event.EventTarget (addEventListener, eventListener)
import Web.HTML (window)
import Web.HTML.HTMLDocument (toDocument)
import Web.HTML.Window (document)

-- | Behavior: A time-varying value with subscriptions
-- | This is a simplified version of Cliffy's Behavior for demonstration
type Behavior a =
  { ref :: Ref a
  , subscribers :: Ref (Array (a -> Effect Unit))
  }

-- | Create a new Behavior with an initial value
behavior :: forall a. a -> Effect (Behavior a)
behavior initial = do
  ref <- Ref.new initial
  subscribers <- Ref.new []
  pure { ref, subscribers }

-- | Get the current value of a Behavior
sample :: forall a. Behavior a -> Effect a
sample b = Ref.read b.ref

-- | Set a new value and notify subscribers
set :: forall a. Behavior a -> a -> Effect Unit
set b value = do
  Ref.write value b.ref
  subs <- Ref.read b.subscribers
  traverse_ (\notify -> notify value) subs
  where
    traverse_ :: forall m b'. Applicative m => (b' -> m Unit) -> Array b' -> m Unit
    traverse_ f arr = void $ sequence $ map f arr

-- | Update value using a function
update :: forall a. Behavior a -> (a -> a) -> Effect Unit
update b f = do
  current <- sample b
  set b (f current)

-- | Subscribe to value changes
subscribe :: forall a. Behavior a -> (a -> Effect Unit) -> Effect Unit
subscribe b callback = do
  Ref.modify_ (\subs -> subs <> [callback]) b.subscribers
  -- Call immediately with current value
  current <- sample b
  callback current

-- | Derive a new Behavior by mapping a function over values
-- | Note: In a full implementation, this would create a dependent Behavior
-- | For this demo, we use subscription to keep derived values in sync
mapBehavior :: forall a b. Behavior a -> (a -> b) -> (b -> Effect Unit) -> Effect Unit
mapBehavior source f callback =
  subscribe source (\a -> callback (f a))

-- | Main entry point
main :: Effect Unit
main = do
  log "Cliffy PureScript Counter initializing..."

  -- Get DOM elements
  win <- window
  doc <- document win
  let docNode = toNonElementParentNode $ toDocument doc

  mCountEl <- getElementById "count" docNode
  mDoubledEl <- getElementById "doubled" docNode
  mIncrementBtn <- getElementById "increment" docNode
  mDecrementBtn <- getElementById "decrement" docNode
  mResetBtn <- getElementById "reset" docNode

  case mCountEl, mDoubledEl, mIncrementBtn, mDecrementBtn, mResetBtn of
    Just countEl, Just doubledEl, Just incrementBtn, Just decrementBtn, Just resetBtn -> do

      -- Create reactive state
      count <- behavior 0

      -- Update count display when value changes
      subscribe count \n -> do
        setTextContent (show n) (Element.toNode countEl)

      -- Update doubled display with appropriate styling
      mapBehavior count (\n -> n * 2) \doubled -> do
        setTextContent (show doubled) (Element.toNode doubledEl)
        let className = case compare doubled 0 of
              GT -> "doubled positive"
              LT -> "doubled negative"
              EQ -> "doubled zero"
        setClassName className doubledEl

      -- Set up button event handlers
      incrementListener <- eventListener \_ -> do
        update count (_ + 1)
        log "Incremented"

      decrementListener <- eventListener \_ -> do
        update count (_ - 1)
        log "Decremented"

      resetListener <- eventListener \_ -> do
        set count 0
        log "Reset"

      addEventListener (EventType "click") incrementListener false (toEventTarget incrementBtn)
      addEventListener (EventType "click") decrementListener false (toEventTarget decrementBtn)
      addEventListener (EventType "click") resetListener false (toEventTarget resetBtn)

      log "Cliffy PureScript Counter initialized!"

    _, _, _, _, _ ->
      log "Error: Could not find required DOM elements"
