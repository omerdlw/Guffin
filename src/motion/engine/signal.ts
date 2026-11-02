export interface Source<T> {
  get(): T;
  subscribe(listener: (value: T) => void): () => void;
}

export class Signal<T> implements Source<T> {
  private listeners = new Set<(value: T) => void>();

  constructor(
    private value: T,
    private equal: (a: T, b: T) => boolean = Object.is,
  ) {}

  get = () => this.value;

  set(value: T) {
    if (this.equal(this.value, value)) return;
    this.value = value;
    for (const listener of Array.from(this.listeners)) listener(value);
  }

  subscribe = (listener: (value: T) => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
}
