{-
Cliffy PureScript Todo Example

Demonstrates:
- List state management with Behavior
- Form handling with input binding
- Derived state (filtered lists, counts)
- Dynamic DOM rendering
- Multiple filter views
-}
module Main where

import Prelude

import Data.Array (filter, length, snoc, (:))
import Data.Array as Array
import Data.Foldable (for_, traverse_)
import Data.Maybe (Maybe(..), fromMaybe)
import Data.String (trim)
import Data.String as String
import Effect (Effect)
import Effect.Console (log)
import Effect.Ref (Ref)
import Effect.Ref as Ref
import Web.DOM.Document (Document, createElement, toNonElementParentNode)
import Web.DOM.Element (Element, fromNode, getAttribute, setAttribute, setClassName, setId, toEventTarget, toNode)
import Web.DOM.Element as Element
import Web.DOM.Node (Node, appendChild, removeChild, setTextContent, parentNode)
import Web.DOM.Node as Node
import Web.DOM.NonElementParentNode (getElementById)
import Web.Event.Event (Event, EventType(..), target)
import Web.Event.EventTarget (addEventListener, eventListener)
import Web.HTML (window)
import Web.HTML.HTMLDocument (toDocument)
import Web.HTML.HTMLInputElement (HTMLInputElement, fromElement, setValue, value)
import Web.HTML.Window (document)

-- | Todo item type
type Todo =
  { id :: Int
  , text :: String
  , completed :: Boolean
  }

-- | Filter type
data Filter = All | Active | Completed

derive instance eqFilter :: Eq Filter

-- | Behavior: A time-varying value with subscriptions
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

-- | Update value using a function
update :: forall a. Behavior a -> (a -> a) -> Effect Unit
update b f = do
  current <- sample b
  set b (f current)

-- | Subscribe to value changes
subscribe :: forall a. Behavior a -> (a -> Effect Unit) -> Effect Unit
subscribe b callback = do
  Ref.modify_ (\subs -> snoc subs callback) b.subscribers
  -- Call immediately with current value
  current <- sample b
  callback current

-- | Combine two behaviors
combine :: forall a b c. Behavior a -> Behavior b -> (a -> b -> c) -> (c -> Effect Unit) -> Effect Unit
combine ba bb f callback = do
  let update' = do
        a <- sample ba
        b <- sample bb
        callback (f a b)
  Ref.modify_ (\subs -> snoc subs (\_ -> update')) ba.subscribers
  Ref.modify_ (\subs -> snoc subs (\_ -> update')) bb.subscribers
  update'

-- | Filter todos based on filter type
filterTodos :: Filter -> Array Todo -> Array Todo
filterTodos All todos = todos
filterTodos Active todos = filter (not <<< _.completed) todos
filterTodos Completed todos = filter _.completed todos

-- | Count active todos
countActive :: Array Todo -> Int
countActive = length <<< filter (not <<< _.completed)

-- | Count completed todos
countCompleted :: Array Todo -> Int
countCompleted = length <<< filter _.completed

-- | Create a todo item DOM element
createTodoElement :: Document -> Todo -> (Int -> Effect Unit) -> (Int -> Effect Unit) -> Effect Element
createTodoElement doc todo toggleFn deleteFn = do
  li <- createElement "li" doc
  setClassName (if todo.completed then "todo-item completed" else "todo-item") li
  setAttribute "data-id" (show todo.id) li

  -- Checkbox
  checkbox <- createElement "input" doc
  setAttribute "type" "checkbox" checkbox
  when todo.completed $ setAttribute "checked" "checked" checkbox

  checkboxListener <- eventListener \_ -> toggleFn todo.id
  addEventListener (EventType "change") checkboxListener false (toEventTarget checkbox)

  -- Text span
  textSpan <- createElement "span" doc
  setClassName "text" textSpan
  setTextContent todo.text (toNode textSpan)

  -- Delete button
  deleteBtn <- createElement "button" doc
  setClassName "delete-btn" deleteBtn
  setTextContent "Delete" (toNode deleteBtn)

  deleteListener <- eventListener \_ -> deleteFn todo.id
  addEventListener (EventType "click") deleteListener false (toEventTarget deleteBtn)

  -- Assemble
  _ <- appendChild (toNode checkbox) (toNode li)
  _ <- appendChild (toNode textSpan) (toNode li)
  _ <- appendChild (toNode deleteBtn) (toNode li)

  pure li

-- | Render the todo list
renderTodoList :: Document -> Element -> Array Todo -> (Int -> Effect Unit) -> (Int -> Effect Unit) -> Effect Unit
renderTodoList doc listEl todos toggleFn deleteFn = do
  -- Clear existing content
  clearChildren (toNode listEl)

  if length todos == 0
    then do
      -- Show empty state
      emptyEl <- createElement "li" doc
      setClassName "empty-state" emptyEl
      setTextContent "No todos to show!" (toNode emptyEl)
      _ <- appendChild (toNode emptyEl) (toNode listEl)
      pure unit
    else do
      -- Render each todo
      for_ todos \todo -> do
        el <- createTodoElement doc todo toggleFn deleteFn
        _ <- appendChild (toNode el) (toNode listEl)
        pure unit

-- | Clear all children of a node
clearChildren :: Node -> Effect Unit
clearChildren node = do
  mChild <- Node.firstChild node
  case mChild of
    Nothing -> pure unit
    Just child -> do
      _ <- removeChild child node
      clearChildren node

-- | Update filter button styles
updateFilterButtons :: Filter -> Element -> Element -> Element -> Effect Unit
updateFilterButtons currentFilter allBtn activeBtn completedBtn = do
  setClassName (if currentFilter == All then "active" else "") allBtn
  setClassName (if currentFilter == Active then "active" else "") activeBtn
  setClassName (if currentFilter == Completed then "active" else "") completedBtn

-- | Main entry point
main :: Effect Unit
main = do
  log "Cliffy PureScript Todo initializing..."

  -- Get DOM elements
  win <- window
  doc <- document win
  let docNode = toNonElementParentNode $ toDocument doc
      htmlDoc = toDocument doc

  mInput <- getElementById "todo-input" docNode
  mAddBtn <- getElementById "add-btn" docNode
  mTodoList <- getElementById "todo-list" docNode
  mFilterAll <- getElementById "filter-all" docNode
  mFilterActive <- getElementById "filter-active" docNode
  mFilterCompleted <- getElementById "filter-completed" docNode
  mActiveCount <- getElementById "active-count" docNode
  mCompletedCount <- getElementById "completed-count" docNode
  mTotalCount <- getElementById "total-count" docNode

  case mInput, mAddBtn, mTodoList, mFilterAll, mFilterActive, mFilterCompleted, mActiveCount, mCompletedCount, mTotalCount of
    Just inputEl, Just addBtn, Just todoListEl, Just filterAllBtn, Just filterActiveBtn, Just filterCompletedBtn, Just activeCountEl, Just completedCountEl, Just totalCountEl -> do

      -- State
      nextId <- Ref.new 1
      todos <- behavior ([] :: Array Todo)
      currentFilter <- behavior All

      -- Toggle todo completion
      let toggleTodo id = do
            update todos \items ->
              map (\t -> if t.id == id then t { completed = not t.completed } else t) items

      -- Delete todo
      let deleteTodo id = do
            update todos \items -> filter (\t -> t.id /= id) items

      -- Render when todos or filter changes
      combine todos currentFilter filterTodos \filtered -> do
        renderTodoList htmlDoc todoListEl filtered toggleTodo deleteTodo

      -- Update stats when todos change
      subscribe todos \items -> do
        setTextContent (show $ countActive items) (toNode activeCountEl)
        setTextContent (show $ countCompleted items) (toNode completedCountEl)
        setTextContent (show $ length items) (toNode totalCountEl)

      -- Update filter buttons when filter changes
      subscribe currentFilter \f -> do
        updateFilterButtons f filterAllBtn filterActiveBtn filterCompletedBtn

      -- Add todo handler
      let addTodo = do
            case fromElement inputEl of
              Nothing -> pure unit
              Just htmlInput -> do
                inputValue <- value htmlInput
                let trimmed = trim inputValue
                when (not $ String.null trimmed) do
                  id <- Ref.read nextId
                  Ref.modify_ (_ + 1) nextId
                  update todos \items -> snoc items { id, text: trimmed, completed: false }
                  setValue "" htmlInput
                  log $ "Added todo: " <> trimmed

      -- Add button click
      addListener <- eventListener \_ -> addTodo
      addEventListener (EventType "click") addListener false (toEventTarget addBtn)

      -- Enter key in input
      keyListener <- eventListener \evt -> do
        -- Check if Enter key (simplified - would need KeyboardEvent for proper implementation)
        addTodo
      addEventListener (EventType "keypress") keyListener false (toEventTarget inputEl)

      -- Filter button handlers
      allListener <- eventListener \_ -> set currentFilter All
      activeListener <- eventListener \_ -> set currentFilter Active
      completedListener <- eventListener \_ -> set currentFilter Completed

      addEventListener (EventType "click") allListener false (toEventTarget filterAllBtn)
      addEventListener (EventType "click") activeListener false (toEventTarget filterActiveBtn)
      addEventListener (EventType "click") completedListener false (toEventTarget filterCompletedBtn)

      log "Cliffy PureScript Todo initialized!"

    _, _, _, _, _, _, _, _, _ ->
      log "Error: Could not find required DOM elements"
