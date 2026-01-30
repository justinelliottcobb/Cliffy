/**
 * StateInspector - Debug visualization for GeometricState
 *
 * Displays multivector coefficients and state trajectory over time.
 */

export interface StateEntry {
  name: string;
  coefficients: number[];
  timestamp: number;
}

/**
 * Inspects and visualizes geometric state for debugging
 */
export class StateInspector {
  private element: HTMLElement;
  private states: Map<string, StateEntry[]> = new Map();
  private maxHistory: number;

  constructor(maxHistory = 100) {
    this.maxHistory = maxHistory;
    this.element = this.createElement();
  }

  /**
   * Register a state for inspection
   */
  register(name: string, coefficients: number[]): void {
    if (!this.states.has(name)) {
      this.states.set(name, []);
    }

    const history = this.states.get(name)!;
    history.push({
      name,
      coefficients: [...coefficients],
      timestamp: performance.now(),
    });

    // Keep only recent history
    if (history.length > this.maxHistory) {
      history.shift();
    }

    this.render();
  }

  /**
   * Get current coefficients for a state
   */
  getCoefficients(name: string): number[] | null {
    const history = this.states.get(name);
    if (!history || history.length === 0) return null;
    return history[history.length - 1].coefficients;
  }

  /**
   * Clear all registered states
   */
  clear(): void {
    this.states.clear();
    this.render();
  }

  /**
   * Get the DOM element
   */
  getElement(): HTMLElement {
    return this.element;
  }

  /**
   * Mount to a parent element
   */
  mount(parent: HTMLElement): void {
    parent.appendChild(this.element);
  }

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'state-inspector';
    return container;
  }

  private render(): void {
    // Clear existing content
    while (this.element.firstChild) {
      this.element.removeChild(this.element.firstChild);
    }

    const header = document.createElement('div');
    header.className = 'state-inspector__header';
    header.textContent = 'State Inspector';
    this.element.appendChild(header);

    for (const [name, history] of this.states.entries()) {
      if (history.length === 0) continue;

      const latest = history[history.length - 1];
      const stateEl = document.createElement('div');
      stateEl.className = 'state-inspector__state';

      const nameEl = document.createElement('div');
      nameEl.className = 'state-inspector__name';
      nameEl.textContent = name;
      stateEl.appendChild(nameEl);

      const coeffsEl = document.createElement('div');
      coeffsEl.className = 'state-inspector__coefficients';
      coeffsEl.textContent = latest.coefficients.map(c => c.toFixed(3)).join(', ');
      stateEl.appendChild(coeffsEl);

      this.element.appendChild(stateEl);
    }
  }
}
