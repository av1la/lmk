export abstract class BaseId {
  protected readonly value: string;

  constructor(value: string) {
    if (!value) {
      throw new Error('ID value cannot be empty');
    }
    this.value = value;
  }

  getValue(): string {
    return this.value;
  }

  equals(other: BaseId): boolean {
    return this.value === other.value;
  }

  abstract toString(): string;
}