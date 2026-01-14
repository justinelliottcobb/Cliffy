/**
 * DOM Binding Helpers for Cliffy
 *
 * These helpers connect Behaviors and Events to DOM elements,
 * providing declarative, reactive DOM updates.
 *
 * @example
 * ```typescript
 * import { behavior, bindText, bindClass, fromClick } from '@cliffy/core';
 *
 * const count = behavior(0);
 * const isEven = count.map(n => n % 2 === 0);
 *
 * // Bind count to display
 * bindText(document.getElementById('count')!, count);
 *
 * // Conditionally add class
 * bindClass(document.getElementById('count')!, 'even', isEven);
 *
 * // Create event from clicks
 * const clicks = fromClick(document.getElementById('btn')!);
 * clicks.subscribe(() => count.update(n => n + 1));
 * ```
 *
 * @packageDocumentation
 */

import { Behavior, Event, Subscription, event, behavior } from './index.js';

// ============================================================================
// Behavior → DOM Bindings
// ============================================================================

/**
 * Bind a Behavior to an element's text content.
 *
 * @param element - The DOM element to update
 * @param source - The Behavior to bind
 * @returns A subscription that can be used to unbind
 *
 * @example
 * ```typescript
 * const name = behavior('Alice');
 * bindText(document.getElementById('greeting')!, name.map(n => `Hello, ${n}!`));
 * ```
 */
export function bindText(
  element: Element,
  source: Behavior<string | number | boolean>
): Subscription {
  // Set initial value
  element.textContent = String(source.sample());

  // Subscribe to changes
  return source.subscribe(value => {
    element.textContent = String(value);
  });
}

/**
 * Bind a Behavior to an element's attribute.
 *
 * @param element - The DOM element to update
 * @param attr - The attribute name
 * @param source - The Behavior to bind
 * @returns A subscription that can be used to unbind
 *
 * @example
 * ```typescript
 * const imageUrl = behavior('/images/default.png');
 * bindAttr(document.getElementById('avatar')!, 'src', imageUrl);
 * ```
 */
export function bindAttr(
  element: Element,
  attr: string,
  source: Behavior<string | number | boolean | null>
): Subscription {
  const update = (value: string | number | boolean | null) => {
    if (value === null || value === false) {
      element.removeAttribute(attr);
    } else if (value === true) {
      element.setAttribute(attr, '');
    } else {
      element.setAttribute(attr, String(value));
    }
  };

  update(source.sample());
  return source.subscribe(update);
}

/**
 * Bind a Behavior to an element's property.
 *
 * Unlike attributes, properties are JavaScript values on the element object.
 *
 * @param element - The DOM element to update
 * @param prop - The property name
 * @param source - The Behavior to bind
 * @returns A subscription that can be used to unbind
 *
 * @example
 * ```typescript
 * const isDisabled = behavior(false);
 * bindProp(document.getElementById('submit')!, 'disabled', isDisabled);
 * ```
 */
export function bindProp<T>(
  element: Element,
  prop: string,
  source: Behavior<T>
): Subscription {
  (element as any)[prop] = source.sample();
  return source.subscribe(value => {
    (element as any)[prop] = value;
  });
}

/**
 * Bind a Behavior to conditionally toggle a CSS class.
 *
 * @param element - The DOM element to update
 * @param className - The class name to toggle
 * @param condition - A Behavior<boolean> that controls the class
 * @returns A subscription that can be used to unbind
 *
 * @example
 * ```typescript
 * const isActive = behavior(false);
 * bindClass(document.getElementById('tab')!, 'active', isActive);
 * ```
 */
export function bindClass(
  element: Element,
  className: string,
  condition: Behavior<boolean>
): Subscription {
  const update = (active: boolean) => {
    element.classList.toggle(className, active);
  };

  update(condition.sample());
  return condition.subscribe(update);
}

/**
 * Bind a Behavior to multiple CSS classes based on a record.
 *
 * @param element - The DOM element to update
 * @param classes - A Behavior containing a record of class names to booleans
 * @returns A subscription that can be used to unbind
 *
 * @example
 * ```typescript
 * const state = behavior({ active: true, disabled: false, highlighted: true });
 * bindClasses(element, state);
 * // Element will have classes: "active highlighted"
 * ```
 */
export function bindClasses(
  element: Element,
  classes: Behavior<Record<string, boolean>>
): Subscription {
  const update = (record: Record<string, boolean>) => {
    for (const [className, active] of Object.entries(record)) {
      element.classList.toggle(className, active);
    }
  };

  update(classes.sample());
  return classes.subscribe(update);
}

/**
 * Bind a Behavior to a CSS style property.
 *
 * @param element - The DOM element to update
 * @param prop - The CSS property name (camelCase or kebab-case)
 * @param source - The Behavior to bind
 * @returns A subscription that can be used to unbind
 *
 * @example
 * ```typescript
 * const width = behavior(100);
 * bindStyle(element, 'width', width.map(w => `${w}px`));
 * ```
 */
export function bindStyle(
  element: HTMLElement,
  prop: string,
  source: Behavior<string | number | null>
): Subscription {
  const update = (value: string | number | null) => {
    if (value === null) {
      element.style.removeProperty(prop);
    } else {
      element.style.setProperty(prop, String(value));
    }
  };

  update(source.sample());
  return source.subscribe(update);
}

/**
 * Bind a Behavior to multiple style properties.
 *
 * @param element - The DOM element to update
 * @param styles - A Behavior containing a record of style properties
 * @returns A subscription that can be used to unbind
 *
 * @example
 * ```typescript
 * const position = behavior({ left: '10px', top: '20px' });
 * bindStyles(element, position);
 * ```
 */
export function bindStyles(
  element: HTMLElement,
  styles: Behavior<Record<string, string | number | null>>
): Subscription {
  const update = (record: Record<string, string | number | null>) => {
    for (const [prop, value] of Object.entries(record)) {
      if (value === null) {
        element.style.removeProperty(prop);
      } else {
        element.style.setProperty(prop, String(value));
      }
    }
  };

  update(styles.sample());
  return styles.subscribe(update);
}

/**
 * Bind a Behavior to the visibility of an element.
 *
 * When false, sets `display: none`. When true, removes the display override.
 *
 * @param element - The DOM element to show/hide
 * @param visible - A Behavior<boolean> controlling visibility
 * @returns A subscription that can be used to unbind
 *
 * @example
 * ```typescript
 * const showDetails = behavior(false);
 * bindVisible(document.getElementById('details')!, showDetails);
 * ```
 */
export function bindVisible(
  element: HTMLElement,
  visible: Behavior<boolean>
): Subscription {
  const update = (show: boolean) => {
    element.style.display = show ? '' : 'none';
  };

  update(visible.sample());
  return visible.subscribe(update);
}

/**
 * Bind a Behavior to the disabled state of a form element.
 *
 * @param element - The form element to enable/disable
 * @param disabled - A Behavior<boolean> controlling disabled state
 * @returns A subscription that can be used to unbind
 */
export function bindDisabled(
  element: HTMLButtonElement | HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  disabled: Behavior<boolean>
): Subscription {
  const update = (isDisabled: boolean) => {
    element.disabled = isDisabled;
  };

  update(disabled.sample());
  return disabled.subscribe(update);
}

// ============================================================================
// Two-Way Bindings (Input Elements)
// ============================================================================

/**
 * Two-way bind a Behavior to an input element's value.
 *
 * Changes to the Behavior update the input, and changes to the input
 * update the Behavior.
 *
 * @param input - The input element to bind
 * @param source - The Behavior to bind
 * @returns A cleanup function that removes all bindings
 *
 * @example
 * ```typescript
 * const name = behavior('');
 * bindValue(document.getElementById('name-input')! as HTMLInputElement, name);
 *
 * // Now `name` stays in sync with the input
 * ```
 */
export function bindValue(
  input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  source: Behavior<string>
): () => void {
  // Behavior → Input
  input.value = source.sample();
  const sub = source.subscribe(value => {
    if (input.value !== value) {
      input.value = value;
    }
  });

  // Input → Behavior
  const handler = () => {
    if (source.sample() !== input.value) {
      source.set(input.value);
    }
  };

  input.addEventListener('input', handler);

  // Return cleanup function
  return () => {
    sub.unsubscribe();
    input.removeEventListener('input', handler);
  };
}

/**
 * Two-way bind a Behavior to a checkbox's checked state.
 *
 * @param input - The checkbox input element
 * @param source - The Behavior<boolean> to bind
 * @returns A cleanup function that removes all bindings
 *
 * @example
 * ```typescript
 * const agreed = behavior(false);
 * bindChecked(document.getElementById('terms')! as HTMLInputElement, agreed);
 * ```
 */
export function bindChecked(
  input: HTMLInputElement,
  source: Behavior<boolean>
): () => void {
  // Behavior → Input
  input.checked = source.sample();
  const sub = source.subscribe(value => {
    if (input.checked !== value) {
      input.checked = value;
    }
  });

  // Input → Behavior
  const handler = () => {
    if (source.sample() !== input.checked) {
      source.set(input.checked);
    }
  };

  input.addEventListener('change', handler);

  return () => {
    sub.unsubscribe();
    input.removeEventListener('change', handler);
  };
}

/**
 * Two-way bind a Behavior to a numeric input's value.
 *
 * @param input - The input element (type="number" or type="range")
 * @param source - The Behavior<number> to bind
 * @returns A cleanup function that removes all bindings
 *
 * @example
 * ```typescript
 * const volume = behavior(50);
 * bindNumber(document.getElementById('volume')! as HTMLInputElement, volume);
 * ```
 */
export function bindNumber(
  input: HTMLInputElement,
  source: Behavior<number>
): () => void {
  // Behavior → Input
  input.valueAsNumber = source.sample();
  const sub = source.subscribe(value => {
    if (input.valueAsNumber !== value && !isNaN(value)) {
      input.valueAsNumber = value;
    }
  });

  // Input → Behavior
  const handler = () => {
    const value = input.valueAsNumber;
    if (!isNaN(value) && source.sample() !== value) {
      source.set(value);
    }
  };

  input.addEventListener('input', handler);

  return () => {
    sub.unsubscribe();
    input.removeEventListener('input', handler);
  };
}

// ============================================================================
// DOM Events → Cliffy Events
// ============================================================================

/**
 * Create a Cliffy Event from a DOM event.
 *
 * @param element - The element to listen on
 * @param eventName - The DOM event name (e.g., 'click', 'input', 'keydown')
 * @param options - Optional event listener options
 * @returns An Event that emits when the DOM event occurs
 *
 * @example
 * ```typescript
 * const clicks = fromEvent(button, 'click');
 * clicks.subscribe(e => console.log('Clicked!', e));
 * ```
 */
export function fromEvent<K extends keyof HTMLElementEventMap>(
  element: HTMLElement,
  eventName: K,
  options?: AddEventListenerOptions
): Event<HTMLElementEventMap[K]> {
  const evt = event<HTMLElementEventMap[K]>();

  element.addEventListener(
    eventName,
    (e) => evt.emit(e),
    options
  );

  return evt;
}

/**
 * Create a Cliffy Event from click events on an element.
 *
 * @param element - The element to listen on
 * @returns An Event<MouseEvent> that emits on clicks
 *
 * @example
 * ```typescript
 * const clicks = fromClick(button);
 * const clickCount = clicks.fold(0, (n, _) => n + 1);
 * ```
 */
export function fromClick(element: HTMLElement): Event<MouseEvent> {
  return fromEvent(element, 'click');
}

/**
 * Create a Cliffy Event from input events on a form element.
 *
 * Emits the current value of the input on each input event.
 *
 * @param input - The input element to listen on
 * @returns An Event<string> that emits the input value
 *
 * @example
 * ```typescript
 * const input = document.getElementById('search') as HTMLInputElement;
 * const searchTerms = fromInput(input);
 * searchTerms.subscribe(term => console.log('Searching:', term));
 * ```
 */
export function fromInput(
  input: HTMLInputElement | HTMLTextAreaElement
): Event<string> {
  const evt = event<string>();

  input.addEventListener('input', () => {
    evt.emit(input.value);
  });

  return evt;
}

/**
 * Create a Cliffy Event from change events on a form element.
 *
 * Unlike `fromInput`, this only emits when the input loses focus
 * or the user presses Enter.
 *
 * @param input - The input element to listen on
 * @returns An Event<string> that emits on change
 */
export function fromChange(
  input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
): Event<string> {
  const evt = event<string>();

  input.addEventListener('change', () => {
    evt.emit(input.value);
  });

  return evt;
}

/**
 * Create a Cliffy Event from form submit events.
 *
 * Automatically prevents default form submission.
 *
 * @param form - The form element to listen on
 * @returns An Event<SubmitEvent> that emits on submit
 *
 * @example
 * ```typescript
 * const submits = fromSubmit(document.getElementById('myForm') as HTMLFormElement);
 * submits.subscribe(e => {
 *   const formData = new FormData(e.target as HTMLFormElement);
 *   // Process form data
 * });
 * ```
 */
export function fromSubmit(form: HTMLFormElement): Event<SubmitEvent> {
  const evt = event<SubmitEvent>();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    evt.emit(e);
  });

  return evt;
}

/**
 * Create a Cliffy Event from keyboard events on an element.
 *
 * @param element - The element to listen on (or document for global)
 * @param eventName - 'keydown', 'keyup', or 'keypress'
 * @returns An Event<KeyboardEvent> that emits on key events
 *
 * @example
 * ```typescript
 * const keydowns = fromKeyboard(document.body, 'keydown');
 * const escapes = keydowns.filter(e => e.key === 'Escape');
 * escapes.subscribe(() => closeModal());
 * ```
 */
export function fromKeyboard(
  element: HTMLElement | Document,
  eventName: 'keydown' | 'keyup' | 'keypress'
): Event<KeyboardEvent> {
  const evt = event<KeyboardEvent>();

  element.addEventListener(eventName, (e) => {
    evt.emit(e as KeyboardEvent);
  });

  return evt;
}

// ============================================================================
// Utility: Binding Groups
// ============================================================================

/**
 * A collection of subscriptions that can be cleaned up together.
 *
 * Useful for managing multiple bindings in a component.
 *
 * @example
 * ```typescript
 * const bindings = new BindingGroup();
 *
 * bindings.add(bindText(el1, behavior1));
 * bindings.add(bindClass(el2, 'active', behavior2));
 * bindings.addCleanup(bindValue(input, behavior3));
 *
 * // Later, clean up all bindings
 * bindings.dispose();
 * ```
 */
export class BindingGroup {
  private subscriptions: Subscription[] = [];
  private cleanups: (() => void)[] = [];

  /**
   * Add a subscription to the group.
   */
  add(subscription: Subscription): void {
    this.subscriptions.push(subscription);
  }

  /**
   * Add a cleanup function to the group.
   *
   * Use this for two-way bindings that return cleanup functions.
   */
  addCleanup(cleanup: () => void): void {
    this.cleanups.push(cleanup);
  }

  /**
   * Dispose of all subscriptions and run all cleanup functions.
   */
  dispose(): void {
    for (const sub of this.subscriptions) {
      sub.unsubscribe();
    }
    for (const cleanup of this.cleanups) {
      cleanup();
    }
    this.subscriptions = [];
    this.cleanups = [];
  }
}
