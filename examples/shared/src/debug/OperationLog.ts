/**
 * OperationLog - Logs operations for debugging
 */

export interface LogEntry {
  timestamp: number;
  type: string;
  description: string;
  data?: unknown;
}

/**
 * Logs and displays operations for debugging
 */
export class OperationLog {
  private element: HTMLElement;
  private entries: LogEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries = 50) {
    this.maxEntries = maxEntries;
    this.element = this.createElement();
  }

  /**
   * Add a log entry
   */
  log(type: string, description: string, data?: unknown): void {
    this.entries.push({
      timestamp: performance.now(),
      type,
      description,
      data,
    });

    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }

    this.render();
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries = [];
    this.render();
  }

  /**
   * Get all entries
   */
  getEntries(): LogEntry[] {
    return [...this.entries];
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
    container.className = 'operation-log';
    return container;
  }

  private render(): void {
    while (this.element.firstChild) {
      this.element.removeChild(this.element.firstChild);
    }

    const header = document.createElement('div');
    header.className = 'operation-log__header';
    header.textContent = 'Operation Log';
    this.element.appendChild(header);

    const list = document.createElement('div');
    list.className = 'operation-log__list';

    for (const entry of this.entries.slice().reverse()) {
      const entryEl = document.createElement('div');
      entryEl.className = 'operation-log__entry';

      const typeEl = document.createElement('span');
      typeEl.className = 'operation-log__type';
      typeEl.textContent = entry.type;
      entryEl.appendChild(typeEl);

      const descEl = document.createElement('span');
      descEl.className = 'operation-log__description';
      descEl.textContent = entry.description;
      entryEl.appendChild(descEl);

      list.appendChild(entryEl);
    }

    this.element.appendChild(list);
  }
}
