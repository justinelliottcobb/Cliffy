/**
 * MetricCard - Displays a single benchmark metric with CPU vs GPU comparison
 */

export interface MetricCardProps {
  label: string;
  cpuValue: number;
  gpuValue: number;
  unit: string;
  /** Show speedup factor */
  showSpeedup?: boolean;
  /** Decimal places for display */
  precision?: number;
}

/**
 * A card displaying a benchmark metric with CPU/GPU comparison
 */
export class MetricCard {
  private element: HTMLElement;
  private props: MetricCardProps;

  // Cached child elements for efficient updates
  private cpuNumber: HTMLElement | null = null;
  private gpuNumber: HTMLElement | null = null;
  private speedupEl: HTMLElement | null = null;
  private gpuValueEl: HTMLElement | null = null;

  constructor(props: MetricCardProps) {
    this.props = { showSpeedup: true, precision: 1, ...props };
    this.element = this.createElement();
  }

  /**
   * Update the displayed values
   */
  update(cpuValue: number, gpuValue: number): void {
    this.props.cpuValue = cpuValue;
    this.props.gpuValue = gpuValue;
    this.updateValues();
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
    const { label, cpuValue, gpuValue, unit, showSpeedup, precision } = this.props;

    const card = document.createElement('div');
    card.className = 'metric-card';

    // Label
    const labelEl = document.createElement('div');
    labelEl.className = 'metric-card__label';
    labelEl.textContent = label;
    card.appendChild(labelEl);

    // Values container
    const valuesEl = document.createElement('div');
    valuesEl.className = 'metric-card__values';

    // CPU value
    const cpuValueEl = this.createValueElement('cpu', cpuValue, unit, precision!);
    valuesEl.appendChild(cpuValueEl);

    // GPU value
    this.gpuValueEl = this.createValueElement('gpu', gpuValue, unit, precision!);
    valuesEl.appendChild(this.gpuValueEl);

    card.appendChild(valuesEl);

    // Speedup indicator
    if (showSpeedup) {
      this.speedupEl = document.createElement('div');
      this.speedupEl.className = 'metric-card__speedup';
      this.updateSpeedup();
      card.appendChild(this.speedupEl);
    }

    return card;
  }

  private createValueElement(
    type: 'cpu' | 'gpu',
    value: number,
    unit: string,
    precision: number
  ): HTMLElement {
    const valueEl = document.createElement('div');
    valueEl.className = `metric-card__value metric-card__value--${type}`;

    const badge = document.createElement('span');
    badge.className = 'metric-card__badge';
    badge.textContent = type.toUpperCase();
    valueEl.appendChild(badge);

    const number = document.createElement('span');
    number.className = 'metric-card__number';
    number.textContent = this.formatNumber(value, precision);
    valueEl.appendChild(number);

    // Cache reference for updates
    if (type === 'cpu') {
      this.cpuNumber = number;
    } else {
      this.gpuNumber = number;
    }

    const unitEl = document.createElement('span');
    unitEl.className = 'metric-card__unit';
    unitEl.textContent = unit;
    valueEl.appendChild(unitEl);

    return valueEl;
  }

  private updateValues(): void {
    const { cpuValue, gpuValue, precision } = this.props;

    if (this.cpuNumber) {
      this.cpuNumber.textContent = this.formatNumber(cpuValue, precision!);
    }

    if (this.gpuNumber) {
      this.gpuNumber.textContent = this.formatNumber(gpuValue, precision!);
    }

    this.updateSpeedup();
  }

  private updateSpeedup(): void {
    const { cpuValue, gpuValue } = this.props;
    const speedup = cpuValue > 0 ? gpuValue / cpuValue : 1;
    const isGpuFaster = speedup > 1;

    if (this.speedupEl) {
      this.speedupEl.textContent = `${speedup.toFixed(1)}x ${isGpuFaster ? 'faster' : 'slower'}`;
      this.speedupEl.className = `metric-card__speedup ${
        isGpuFaster ? 'metric-card__speedup--positive' : 'metric-card__speedup--negative'
      }`;
    }

    if (this.gpuValueEl) {
      this.gpuValueEl.classList.toggle('metric-card__value--faster', isGpuFaster);
    }
  }

  private formatNumber(value: number, precision: number): string {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(precision) + 'M';
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(precision) + 'K';
    }
    return value.toFixed(precision);
  }
}

/**
 * Create a metric card element (functional style)
 */
export function createMetricCard(props: MetricCardProps): HTMLElement {
  return new MetricCard(props).getElement();
}
