export class Rating {
  private readonly _value: number;

  private constructor(value: number) {
    this._value = value;
  }

  static create(value: number): Rating {
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      throw new Error("별점은 1~5 사이여야 합니다");
    }
    return new Rating(value);
  }

  get value(): number {
    return this._value;
  }

  equals(other: Rating): boolean {
    return this._value === other._value;
  }
}
