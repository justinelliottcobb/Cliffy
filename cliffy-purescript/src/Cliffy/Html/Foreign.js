// FFI for Cliffy.Html PureScript module
// Implements the Algebraic TSX DOM operations

import * as CliffyWasm from '../../../cliffy-wasm/pkg/cliffy_wasm.js';

// Track subscriptions for cleanup
const elementSubscriptions = new WeakMap();

function trackSubscription(element, subscription) {
    if (!elementSubscriptions.has(element)) {
        elementSubscriptions.set(element, []);
    }
    elementSubscriptions.get(element).push(subscription);
}

// Check if a value is a Cliffy Behavior
function isBehavior(value) {
    return value !== null &&
           typeof value === 'object' &&
           typeof value.sample === 'function' &&
           typeof value.subscribe === 'function';
}

// ============================================================================
// Element creation
// ============================================================================

export const createElementImpl = (tag) => (props) => () => {
    const element = document.createElement(tag);

    for (const prop of props) {
        applyProp(element, prop);
    }

    return element;
};

export const appendChildImpl = (parent) => (child) => () => {
    parent.appendChild(child);
    return parent;
};

export const createTextNodeImpl = (text) => () => {
    return document.createTextNode(text);
};

export const createFragmentImpl = (children) => () => {
    const fragment = document.createDocumentFragment();
    for (const child of children) {
        fragment.appendChild(child);
    }
    return fragment;
};

// ============================================================================
// Mounting
// ============================================================================

export const mountImpl = (element) => (selector) => () => {
    const container = document.querySelector(selector);
    if (!container) {
        throw new Error(`Mount target not found: ${selector}`);
    }

    // Clear existing content safely
    while (container.firstChild) {
        cleanupElement(container.firstChild);
        container.removeChild(container.firstChild);
    }

    container.appendChild(element);

    // Return unmount function
    return () => {
        cleanupElement(element);
        element.remove();
    };
};

export const unmountImpl = (selector) => () => {
    const container = document.querySelector(selector);
    if (container) {
        // Cleanup and remove all children safely
        while (container.firstChild) {
            cleanupElement(container.firstChild);
            container.removeChild(container.firstChild);
        }
    }
};

function cleanupElement(element) {
    if (!element) return;

    // Unsubscribe all behaviors
    const subs = elementSubscriptions.get(element);
    if (subs) {
        for (const sub of subs) {
            if (typeof sub.unsubscribe === 'function') {
                sub.unsubscribe();
            }
        }
        elementSubscriptions.delete(element);
    }

    // Recursively cleanup children
    if (element.children) {
        for (const child of element.children) {
            cleanupElement(child);
        }
    }
}

// ============================================================================
// Behavior text binding
// ============================================================================

export const setBehaviorTextImpl = (element) => (behavior) => () => {
    if (isBehavior(behavior)) {
        // Set initial value
        const textNode = document.createTextNode(String(behavior.sample()));

        // Subscribe to changes
        const subscription = behavior.subscribe((value) => {
            textNode.textContent = String(value);
        });

        trackSubscription(textNode, subscription);
        return textNode;
    } else {
        return document.createTextNode(String(behavior));
    }
};

export const setBehaviorHtmlImpl = (container) => (behavior) => (renderFn) => () => {
    if (isBehavior(behavior)) {
        // Create a placeholder element
        const wrapper = document.createElement('span');
        wrapper.style.display = 'contents';

        // Render initial content
        let currentContent = renderFn(behavior.sample());
        wrapper.appendChild(currentContent);

        // Subscribe to changes
        const subscription = behavior.subscribe((value) => {
            // Cleanup old content
            cleanupElement(currentContent);
            currentContent.remove();

            // Render new content
            currentContent = renderFn(value);
            wrapper.appendChild(currentContent);
        });

        trackSubscription(wrapper, subscription);
        return wrapper;
    } else {
        return renderFn(behavior);
    }
};

// ============================================================================
// Properties
// ============================================================================

// Property types for internal use
const PropType = {
    ATTRIBUTE: 'attribute',
    BEHAVIOR_ATTRIBUTE: 'behaviorAttribute',
    EVENT: 'event',
    STYLE_OBJECT: 'styleObject'
};

export const mkPropImpl = (name) => (value) => () => ({
    type: PropType.ATTRIBUTE,
    name,
    value
});

export const mkBehaviorPropImpl = (name) => (behavior) => (toValue) => () => ({
    type: PropType.BEHAVIOR_ATTRIBUTE,
    name,
    behavior,
    toValue
});

export const mkEventPropImpl = (eventName) => (handler) => () => ({
    type: PropType.EVENT,
    name: eventName,
    handler
});

export const styleObj = (obj) => ({
    type: PropType.STYLE_OBJECT,
    value: obj
});

// Apply a property to an element
function applyProp(element, prop) {
    switch (prop.type) {
        case PropType.ATTRIBUTE:
            applyAttribute(element, prop.name, prop.value);
            break;

        case PropType.BEHAVIOR_ATTRIBUTE:
            applyBehaviorAttribute(element, prop.name, prop.behavior, prop.toValue);
            break;

        case PropType.EVENT:
            element.addEventListener(prop.name, (e) => prop.handler(e)());
            break;

        case PropType.STYLE_OBJECT:
            for (const [key, value] of Object.entries(prop.value)) {
                element.style[key] = value;
            }
            break;
    }
}

function applyAttribute(element, name, value) {
    // Handle boolean attributes
    if (typeof value === 'boolean') {
        if (value) {
            element.setAttribute(name, '');
        } else {
            element.removeAttribute(name);
        }
        return;
    }

    // Handle special attributes
    if (name === 'class') {
        element.className = String(value);
    } else if (name === 'style' && typeof value === 'string') {
        element.setAttribute('style', value);
    } else if (name === 'value' && element instanceof HTMLInputElement) {
        element.value = String(value);
    } else if (name === 'checked' && element instanceof HTMLInputElement) {
        element.checked = Boolean(value);
    } else {
        element.setAttribute(name, String(value));
    }
}

function applyBehaviorAttribute(element, name, behavior, toValue) {
    if (isBehavior(behavior)) {
        // Apply initial value
        const initialValue = toValue(behavior.sample());
        applyAttribute(element, name, initialValue);

        // Subscribe to changes
        const subscription = behavior.subscribe((value) => {
            applyAttribute(element, name, toValue(value));
        });

        trackSubscription(element, subscription);
    } else {
        // Static value
        applyAttribute(element, name, toValue(behavior));
    }
}

// ============================================================================
// PropValue converters
// ============================================================================

export const stringToPropValue = (s) => s;
export const boolToPropValue = (b) => b;
export const intToPropValue = (n) => n;
export const numberToPropValue = (n) => n;

// ============================================================================
// Event helpers
// ============================================================================

export const preventDefault = (e) => () => {
    e.preventDefault();
};

export const stopPropagation = (e) => () => {
    e.stopPropagation();
};

export const targetValue = (e) => {
    return e.target?.value ?? '';
};

export const targetChecked = (e) => {
    return e.target?.checked ?? false;
};

// ============================================================================
// Utility helpers for PureScript FFI
// ============================================================================

export const runEffectFn1Sync = (fn) => (a) => fn(a)();
export const runEffectFn2Sync = (fn) => (a) => (b) => fn(a)(b)();
export const runEffectFn3Sync = (fn) => (a) => (b) => (c) => fn(a)(b)(c)();

export const unsafeCoerceToBoolean = (x) => Boolean(x);

export const foldl = (f) => (init) => (arr) => arr.reduce((acc, x) => f(acc)(x), init);
