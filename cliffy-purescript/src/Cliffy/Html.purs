-- | Type-safe HTML DSL for Cliffy
-- |
-- | This module provides a declarative, type-safe way to build reactive HTML
-- | using Cliffy's FRP primitives (Behavior, Event).
-- |
-- | ```purescript
-- | counter :: Effect Element
-- | counter = do
-- |     count <- behavior 0
-- |
-- |     pure $ div [ className "counter" ]
-- |         [ span_ [ text "Count: ", behaviorText count ]
-- |         , button [ onClick \_ -> count # update (_ + 1) ]
-- |             [ text "+" ]
-- |         ]
-- | ```
module Cliffy.Html
  ( -- * Element type
    Element
  , Html
  , Prop

    -- * Creating elements
  , el
  , el_
  , text
  , behaviorText
  , behaviorHtml
  , fragment

    -- * Common HTML elements
  , div, div_
  , span, span_
  , p, p_
  , a, a_
  , button, button_
  , input
  , label, label_
  , ul, ul_
  , ol, ol_
  , li, li_
  , h1, h1_, h2, h2_, h3, h3_, h4, h4_, h5, h5_, h6, h6_
  , form, form_
  , img
  , table, table_
  , tr, tr_
  , td, td_
  , th, th_
  , thead, thead_
  , tbody, tbody_
  , section, section_
  , article, article_
  , header, header_
  , footer, footer_
  , nav, nav_
  , main, main_
  , aside, aside_

    -- * Mounting
  , mount
  , unmount

    -- * Re-exports
  , module Cliffy.Html.Attributes
  , module Cliffy.Html.Events
  ) where

import Prelude

import Data.Array ((:))
import Data.Maybe (Maybe(..))
import Effect (Effect)
import Effect.Uncurried (EffectFn1, EffectFn2, EffectFn3, runEffectFn1, runEffectFn2, runEffectFn3)

import Cliffy.Html.Attributes (Prop, className, id, style, href, src, alt, type_, value, placeholder, disabled, checked, hidden, title, name, for, tabIndex, role, ariaLabel, dataAttr)
import Cliffy.Html.Events (onClick, onChange, onInput, onSubmit, onFocus, onBlur, onKeyDown, onKeyUp, onKeyPress, onMouseEnter, onMouseLeave)

-- | Opaque type for DOM elements
foreign import data Element :: Type

-- | Html is an alias for Element (for familiarity)
type Html = Element

-- | Foreign imports for DOM operations
foreign import createElementImpl :: EffectFn2 String (Array Prop) Element
foreign import appendChildImpl :: EffectFn2 Element Element Element
foreign import createTextNodeImpl :: EffectFn1 String Element
foreign import createFragmentImpl :: EffectFn1 (Array Element) Element
foreign import mountImpl :: EffectFn2 Element String (Effect Unit)
foreign import unmountImpl :: EffectFn1 String (Effect Unit)
foreign import setBehaviorTextImpl :: forall a. EffectFn2 Element a Element
foreign import setBehaviorHtmlImpl :: forall a. EffectFn3 Element a (a -> Element) Element

-- | Create an element with the given tag name, properties, and children
el :: String -> Array Prop -> Array Element -> Effect Element
el tag props children = do
    element <- runEffectFn2 createElementImpl tag props
    appendChildren element children

-- | Create an element with no properties
el_ :: String -> Array Element -> Effect Element
el_ tag = el tag []

-- | Append an array of children to a parent element
appendChildren :: Element -> Array Element -> Effect Element
appendChildren parent [] = pure parent
appendChildren parent (child : rest) = do
    _ <- runEffectFn2 appendChildImpl parent child
    appendChildren parent rest

-- | Create a text node
text :: String -> Element
text = runEffectFn1Sync createTextNodeImpl

-- | Create a text node that updates when a Behavior changes
-- |
-- | ```purescript
-- | count <- behavior 0
-- | span_ [ text "Count: ", behaviorText count ]
-- | ```
behaviorText :: forall a. Show a => a -> Element
behaviorText value = runEffectFn2Sync setBehaviorTextImpl (text "") value

-- | Create dynamic HTML content that updates when a Behavior changes
-- |
-- | ```purescript
-- | items <- behavior ["a", "b", "c"]
-- | behaviorHtml items \list ->
-- |     ul_ $ map (\item -> li_ [ text item ]) list
-- | ```
behaviorHtml :: forall a. a -> (a -> Element) -> Element
behaviorHtml initial render = runEffectFn3Sync setBehaviorHtmlImpl (render initial) initial render

-- | Create a document fragment (multiple root elements)
fragment :: Array Element -> Element
fragment = runEffectFn1Sync createFragmentImpl

-- | Mount an element to a container (by CSS selector)
-- | Returns an unmount function
mount :: Element -> String -> Effect (Effect Unit)
mount element selector = runEffectFn2 mountImpl element selector

-- | Unmount and cleanup an element from a container
unmount :: String -> Effect Unit
unmount = runEffectFn1 unmountImpl

-- Synchronous FFI helpers (for pure element construction)
foreign import runEffectFn1Sync :: forall a b. EffectFn1 a b -> a -> b
foreign import runEffectFn2Sync :: forall a b c. EffectFn2 a b c -> a -> b -> c
foreign import runEffectFn3Sync :: forall a b c d. EffectFn3 a b c d -> a -> b -> c -> d

-- Common HTML elements

div :: Array Prop -> Array Element -> Element
div props children = runEffectFn1Sync (el "div" props) children

div_ :: Array Element -> Element
div_ = div []

span :: Array Prop -> Array Element -> Element
span props children = runEffectFn1Sync (el "span" props) children

span_ :: Array Element -> Element
span_ = span []

p :: Array Prop -> Array Element -> Element
p props children = runEffectFn1Sync (el "p" props) children

p_ :: Array Element -> Element
p_ = p []

a :: Array Prop -> Array Element -> Element
a props children = runEffectFn1Sync (el "a" props) children

a_ :: Array Element -> Element
a_ = a []

button :: Array Prop -> Array Element -> Element
button props children = runEffectFn1Sync (el "button" props) children

button_ :: Array Element -> Element
button_ = button []

input :: Array Prop -> Element
input props = runEffectFn1Sync (el "input" props) []

label :: Array Prop -> Array Element -> Element
label props children = runEffectFn1Sync (el "label" props) children

label_ :: Array Element -> Element
label_ = label []

ul :: Array Prop -> Array Element -> Element
ul props children = runEffectFn1Sync (el "ul" props) children

ul_ :: Array Element -> Element
ul_ = ul []

ol :: Array Prop -> Array Element -> Element
ol props children = runEffectFn1Sync (el "ol" props) children

ol_ :: Array Element -> Element
ol_ = ol []

li :: Array Prop -> Array Element -> Element
li props children = runEffectFn1Sync (el "li" props) children

li_ :: Array Element -> Element
li_ = li []

h1 :: Array Prop -> Array Element -> Element
h1 props children = runEffectFn1Sync (el "h1" props) children

h1_ :: Array Element -> Element
h1_ = h1 []

h2 :: Array Prop -> Array Element -> Element
h2 props children = runEffectFn1Sync (el "h2" props) children

h2_ :: Array Element -> Element
h2_ = h2 []

h3 :: Array Prop -> Array Element -> Element
h3 props children = runEffectFn1Sync (el "h3" props) children

h3_ :: Array Element -> Element
h3_ = h3 []

h4 :: Array Prop -> Array Element -> Element
h4 props children = runEffectFn1Sync (el "h4" props) children

h4_ :: Array Element -> Element
h4_ = h4 []

h5 :: Array Prop -> Array Element -> Element
h5 props children = runEffectFn1Sync (el "h5" props) children

h5_ :: Array Element -> Element
h5_ = h5 []

h6 :: Array Prop -> Array Element -> Element
h6 props children = runEffectFn1Sync (el "h6" props) children

h6_ :: Array Element -> Element
h6_ = h6 []

form :: Array Prop -> Array Element -> Element
form props children = runEffectFn1Sync (el "form" props) children

form_ :: Array Element -> Element
form_ = form []

img :: Array Prop -> Element
img props = runEffectFn1Sync (el "img" props) []

table :: Array Prop -> Array Element -> Element
table props children = runEffectFn1Sync (el "table" props) children

table_ :: Array Element -> Element
table_ = table []

tr :: Array Prop -> Array Element -> Element
tr props children = runEffectFn1Sync (el "tr" props) children

tr_ :: Array Element -> Element
tr_ = tr []

td :: Array Prop -> Array Element -> Element
td props children = runEffectFn1Sync (el "td" props) children

td_ :: Array Element -> Element
td_ = td []

th :: Array Prop -> Array Element -> Element
th props children = runEffectFn1Sync (el "th" props) children

th_ :: Array Element -> Element
th_ = th []

thead :: Array Prop -> Array Element -> Element
thead props children = runEffectFn1Sync (el "thead" props) children

thead_ :: Array Element -> Element
thead_ = thead []

tbody :: Array Prop -> Array Element -> Element
tbody props children = runEffectFn1Sync (el "tbody" props) children

tbody_ :: Array Element -> Element
tbody_ = tbody []

section :: Array Prop -> Array Element -> Element
section props children = runEffectFn1Sync (el "section" props) children

section_ :: Array Element -> Element
section_ = section []

article :: Array Prop -> Array Element -> Element
article props children = runEffectFn1Sync (el "article" props) children

article_ :: Array Element -> Element
article_ = article []

header :: Array Prop -> Array Element -> Element
header props children = runEffectFn1Sync (el "header" props) children

header_ :: Array Element -> Element
header_ = header []

footer :: Array Prop -> Array Element -> Element
footer props children = runEffectFn1Sync (el "footer" props) children

footer_ :: Array Element -> Element
footer_ = footer []

nav :: Array Prop -> Array Element -> Element
nav props children = runEffectFn1Sync (el "nav" props) children

nav_ :: Array Element -> Element
nav_ = nav []

main :: Array Prop -> Array Element -> Element
main props children = runEffectFn1Sync (el "main" props) children

main_ :: Array Element -> Element
main_ = main []

aside :: Array Prop -> Array Element -> Element
aside props children = runEffectFn1Sync (el "aside" props) children

aside_ :: Array Element -> Element
aside_ = aside []
