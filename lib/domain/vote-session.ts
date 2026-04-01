export class VoteSession {
  private _title: string;
  private _status: "open" | "closed";

  private constructor(title: string) {
    this._title = title;
    this._status = "open";
  }

  static create(title: string): VoteSession {
    if (!title.trim()) {
      throw new Error("제목은 비어있을 수 없습니다");
    }
    return new VoteSession(title);
  }

  get title(): string {
    return this._title;
  }

  close(): void {
    if (this._status === "closed") {
      throw new Error("이미 종료된 세션입니다");
    }
    this._status = "closed";
  }

  get isClosed(): boolean {
    return this._status === "closed";
  }
}
