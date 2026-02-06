/**
 * Tagged template literal for creating reactive DOM elements.
 *
 * This module provides an `html` template tag that creates real DOM elements
 * with automatic reactive bindings for Behavior values.
 *
 * @example
 * ```typescript
 * import { html, mount } from '@cliffy/core';
 * import { Behavior } from '@cliffy/core';
 *
 * const count = new Behavior(0);
 * const label = new Behavior('Count');
 *
 * const element = html`
 *     <div class="counter">
 *         <span>${label}: ${count}</span>
 *         <button onclick=${() => count.update(n => n + 1)}>+</button>
 *     </div>
 * `;
 *
 * mount(element, '#app');
 * ```
 */

import type { Behavior, DOMProjection, Subscription } from './cliffy_wasm';

// Type guard to check if a value is a Behavior
function isBehavior(value: unknown): value is Behavior {
    return value !== null &&
           typeof value === 'object' &&
           'sample' in value &&
           'subscribe' in value &&
           typeof (value as any).sample === 'function' &&
           typeof (value as any).subscribe === 'function';
}

// Marker for placeholder values in the template
// Using a distinctive string pattern that survives HTML parsing
// (null bytes get stripped, HTML comments become Comment nodes)
const PLACEHOLDER_PREFIX = '\u200B__CLIFFY_PH_';
const PLACEHOLDER_SUFFIX = '_PH__\u200B';

interface CliffyElement extends HTMLElement {
    __cliffy_subscriptions?: Subscription[];
    __cliffy_cleanup?: (() => void)[];
}

interface ParsedTemplate {
    html: string;
    values: unknown[];
}

/**
 * Parse the template literal into HTML string with placeholders
 */
function parseTemplate(strings: TemplateStringsArray, values: unknown[]): ParsedTemplate {
    let html = '';
    for (let i = 0; i < strings.length; i++) {
        html += strings[i];
        if (i < values.length) {
            html += `${PLACEHOLDER_PREFIX}${i}${PLACEHOLDER_SUFFIX}`;
        }
    }
    return { html, values };
}

/**
 * Process an element's attributes, replacing placeholders with actual values
 * and setting up reactive bindings for Behaviors
 */
function processAttributes(
    element: CliffyElement,
    values: unknown[],
    DOMProjectionClass: typeof DOMProjection
): void {
    const attributes = Array.from(element.attributes);

    for (const attr of attributes) {
        const name = attr.name;
        const value = attr.value;

        // Check if the attribute value contains a placeholder
        const placeholderMatch = value.match(new RegExp(`${PLACEHOLDER_PREFIX}(\\d+)${PLACEHOLDER_SUFFIX}`));

        if (placeholderMatch) {
            const index = parseInt(placeholderMatch[1], 10);
            const actualValue = values[index];

            // Remove the placeholder attribute
            element.removeAttribute(name);

            // Handle event listeners (onclick, onchange, etc.)
            if (name.startsWith('on')) {
                const eventName = name.slice(2).toLowerCase();
                if (typeof actualValue === 'function') {
                    element.addEventListener(eventName, actualValue as EventListener);

                    // Track for cleanup
                    if (!element.__cliffy_cleanup) {
                        element.__cliffy_cleanup = [];
                    }
                    element.__cliffy_cleanup.push(() => {
                        element.removeEventListener(eventName, actualValue as EventListener);
                    });
                }
            }
            // Handle Behavior values - create projections
            else if (isBehavior(actualValue)) {
                const behavior = actualValue;

                // Determine projection type based on attribute
                if (name === 'class' || name === 'className') {
                    // For class, we need to handle it specially
                    const subscription = behavior.subscribe((val: unknown) => {
                        element.className = String(val);
                    });
                    trackSubscription(element, subscription);
                } else if (name === 'style') {
                    const subscription = behavior.subscribe((val: unknown) => {
                        element.setAttribute('style', String(val));
                    });
                    trackSubscription(element, subscription);
                } else if (name === 'checked' || name === 'disabled' || name === 'hidden') {
                    // Boolean attributes
                    const subscription = behavior.subscribe((val: unknown) => {
                        if (val) {
                            element.setAttribute(name, '');
                        } else {
                            element.removeAttribute(name);
                        }
                    });
                    trackSubscription(element, subscription);
                } else if (name === 'value' && element instanceof HTMLInputElement) {
                    // Input value - bidirectional binding potential
                    const subscription = behavior.subscribe((val: unknown) => {
                        (element as HTMLInputElement).value = String(val);
                    });
                    trackSubscription(element, subscription);
                } else if (name.startsWith('data-')) {
                    // Data attributes
                    const dataKey = name.slice(5);
                    const subscription = behavior.subscribe((val: unknown) => {
                        element.dataset[dataKey] = String(val);
                    });
                    trackSubscription(element, subscription);
                } else {
                    // Generic attribute
                    const subscription = behavior.subscribe((val: unknown) => {
                        if (val === null || val === undefined || val === false) {
                            element.removeAttribute(name);
                        } else {
                            element.setAttribute(name, String(val));
                        }
                    });
                    trackSubscription(element, subscription);
                }
            }
            // Handle static values
            else {
                if (name === 'class' || name === 'className') {
                    element.className = String(actualValue);
                } else if (actualValue === true) {
                    element.setAttribute(name, '');
                } else if (actualValue !== false && actualValue !== null && actualValue !== undefined) {
                    element.setAttribute(name, String(actualValue));
                }
            }
        }
    }
}

/**
 * Process text content, replacing placeholders with actual values
 * and setting up reactive bindings for Behaviors
 */
function processTextContent(
    node: Text,
    values: unknown[],
    parent: Node
): void {
    const text = node.textContent || '';
    const placeholderRegex = new RegExp(`${PLACEHOLDER_PREFIX}(\\d+)${PLACEHOLDER_SUFFIX}`, 'g');

    // Check if this text node contains any placeholders
    if (!placeholderRegex.test(text)) {
        return;
    }

    // Reset regex
    placeholderRegex.lastIndex = 0;

    // Split text by placeholders
    const parts: Array<string | { index: number }> = [];
    let lastIndex = 0;
    let match;

    while ((match = placeholderRegex.exec(text)) !== null) {
        // Add text before placeholder
        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
        }
        // Add placeholder reference
        parts.push({ index: parseInt(match[1], 10) });
        lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }

    // Create document fragment with nodes for each part
    const fragment = document.createDocumentFragment();

    for (const part of parts) {
        if (typeof part === 'string') {
            fragment.appendChild(document.createTextNode(part));
        } else {
            const actualValue = values[part.index];

            if (isBehavior(actualValue)) {
                // Check if the Behavior contains DOM nodes or primitive values
                const initialValue = actualValue.sample();

                if (initialValue instanceof Node || initialValue instanceof DocumentFragment) {
                    // Behavior contains DOM nodes - need placeholder and replacement logic
                    const placeholder = document.createComment('cliffy-reactive');
                    fragment.appendChild(placeholder);

                    // Insert initial content after placeholder
                    let currentNode: Node = initialValue;
                    placeholder.parentNode?.insertBefore(currentNode, placeholder.nextSibling);

                    const subscription = actualValue.subscribe((val: unknown) => {
                        const newNode = val instanceof Node || val instanceof DocumentFragment
                            ? val
                            : document.createTextNode(String(val ?? ''));
                        currentNode.parentNode?.replaceChild(newNode, currentNode);
                        currentNode = newNode;
                    });

                    const parentElement = parent as CliffyElement;
                    trackSubscription(parentElement, subscription);
                } else {
                    // Behavior contains primitive value - use text node
                    const textNode = document.createTextNode(String(initialValue ?? ''));
                    fragment.appendChild(textNode);

                    const subscription = actualValue.subscribe((val: unknown) => {
                        if (val instanceof Node) {
                            textNode.parentNode?.replaceChild(val, textNode);
                        } else {
                            textNode.textContent = String(val ?? '');
                        }
                    });

                    const parentElement = parent as CliffyElement;
                    trackSubscription(parentElement, subscription);
                }
            } else if (actualValue instanceof Node) {
                // It's a DOM node (possibly from nested html``)
                fragment.appendChild(actualValue);
            } else if (Array.isArray(actualValue)) {
                // Array of nodes
                for (const item of actualValue) {
                    if (item instanceof Node) {
                        fragment.appendChild(item);
                    } else {
                        fragment.appendChild(document.createTextNode(String(item)));
                    }
                }
            } else {
                // Static value
                fragment.appendChild(document.createTextNode(String(actualValue ?? '')));
            }
        }
    }

    // Replace the original text node with the fragment
    node.parentNode?.replaceChild(fragment, node);
}

/**
 * Track a subscription on an element for cleanup
 */
function trackSubscription(element: CliffyElement, subscription: Subscription): void {
    if (!element.__cliffy_subscriptions) {
        element.__cliffy_subscriptions = [];
    }
    element.__cliffy_subscriptions.push(subscription);
}

/**
 * Recursively process all nodes in the tree
 */
function processNode(
    node: Node,
    values: unknown[],
    DOMProjectionClass: typeof DOMProjection
): void {
    if (node.nodeType === Node.ELEMENT_NODE) {
        processAttributes(node as CliffyElement, values, DOMProjectionClass);

        // Process children (copy array since we might modify during iteration)
        const children = Array.from(node.childNodes);
        for (const child of children) {
            processNode(child, values, DOMProjectionClass);
        }
    } else if (node.nodeType === Node.TEXT_NODE) {
        processTextContent(node as Text, values, node.parentNode || node);
    }
}

/**
 * Tagged template literal for creating reactive DOM elements.
 *
 * Creates real DOM elements with automatic reactive bindings:
 * - Behavior values in text content automatically update
 * - Behavior values in attributes create DOM projections
 * - Event handlers (onclick, onchange, etc.) are wired up
 * - Nested html`` templates are supported
 *
 * @example
 * ```typescript
 * const count = new Behavior(0);
 *
 * const el = html`
 *     <button onclick=${() => count.update(n => n + 1)}>
 *         Clicked ${count} times
 *     </button>
 * `;
 * ```
 */
export function html(strings: TemplateStringsArray, ...values: unknown[]): DocumentFragment | Element {
    const { html: htmlString, values: templateValues } = parseTemplate(strings, values);

    // Parse HTML using template element (handles any valid HTML)
    const template = document.createElement('template');
    template.innerHTML = htmlString.trim();

    // Get the content
    const content = template.content;

    // Process all nodes
    const children = Array.from(content.childNodes);
    for (const child of children) {
        // Need to get DOMProjection from the module - this will be injected
        processNode(child, templateValues, (globalThis as any).__cliffy_DOMProjection);
    }

    // Return single element if only one top-level element, otherwise return fragment
    if (content.children.length === 1 && content.childNodes.length === 1) {
        return content.firstElementChild as Element;
    }

    return content;
}

/**
 * Mount an element or fragment to a container.
 *
 * @param element - The element to mount (from html`` or any DOM node)
 * @param container - CSS selector or DOM element to mount into
 * @returns Cleanup function that removes the element and unsubscribes all Behaviors
 *
 * @example
 * ```typescript
 * const cleanup = mount(html`<div>Hello</div>`, '#app');
 *
 * // Later: remove and cleanup
 * cleanup();
 * ```
 */
export function mount(
    element: Node | DocumentFragment,
    container: string | Element
): () => void {
    const target = typeof container === 'string'
        ? document.querySelector(container)
        : container;

    if (!target) {
        throw new Error(`Mount target not found: ${container}`);
    }

    // Clear existing content
    target.innerHTML = '';

    // Track all mounted elements for cleanup
    const mountedElements: CliffyElement[] = [];

    if (element instanceof DocumentFragment) {
        // Track all elements before appending (fragment will be emptied)
        const children = Array.from(element.children) as CliffyElement[];
        mountedElements.push(...children);
        target.appendChild(element);
    } else {
        mountedElements.push(element as CliffyElement);
        target.appendChild(element);
    }

    // Return cleanup function
    return () => {
        for (const el of mountedElements) {
            // Unsubscribe all Behaviors
            if (el.__cliffy_subscriptions) {
                for (const sub of el.__cliffy_subscriptions) {
                    sub.unsubscribe();
                }
            }

            // Run cleanup functions
            if (el.__cliffy_cleanup) {
                for (const cleanup of el.__cliffy_cleanup) {
                    cleanup();
                }
            }

            // Also clean up children recursively
            cleanupElement(el);

            // Remove from DOM
            el.remove();
        }
    };
}

/**
 * Recursively cleanup all subscriptions in an element tree
 */
function cleanupElement(element: Element): void {
    for (const child of Array.from(element.children)) {
        const cliffyChild = child as CliffyElement;

        if (cliffyChild.__cliffy_subscriptions) {
            for (const sub of cliffyChild.__cliffy_subscriptions) {
                sub.unsubscribe();
            }
        }

        if (cliffyChild.__cliffy_cleanup) {
            for (const cleanup of cliffyChild.__cliffy_cleanup) {
                cleanup();
            }
        }

        cleanupElement(child);
    }
}

/**
 * Create a component that can be reused with props.
 *
 * @param render - Function that takes props and returns an element
 * @returns A function that creates mounted instances of the component
 *
 * @example
 * ```typescript
 * interface CounterProps {
 *     initial?: number;
 *     label?: string;
 * }
 *
 * const Counter = component<CounterProps>(({ initial = 0, label = 'Count' }) => {
 *     const count = new Behavior(initial);
 *
 *     return html`
 *         <div class="counter">
 *             <span>${label}: ${count}</span>
 *             <button onclick=${() => count.update(n => n + 1)}>+</button>
 *         </div>
 *     `;
 * });
 *
 * // Usage
 * mount(Counter({ initial: 10, label: 'Clicks' }), '#app');
 * ```
 */
export function component<P extends object>(
    render: (props: P) => Node | DocumentFragment
): (props: P) => Node | DocumentFragment {
    return render;
}

/**
 * Initialize the html template system.
 * Call this after loading the WASM module.
 *
 * @param DOMProjectionClass - The DOMProjection class from the WASM module
 */
export function initHtml(DOMProjectionClass: typeof DOMProjection): void {
    (globalThis as any).__cliffy_DOMProjection = DOMProjectionClass;
}
