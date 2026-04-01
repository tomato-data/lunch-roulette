function defaultRevealAt(): string {
  const now = new Date();
  // KST = UTC+9, default 12:55 KST
  const kstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = kstDate.getUTCFullYear();
  const month = kstDate.getUTCMonth();
  const day = kstDate.getUTCDate();
  // Create 12:55 KST = 03:55 UTC
  return new Date(Date.UTC(year, month, day, 3, 55, 0)).toISOString();
}

export class VoteSession {
  private _title: string;
  private _status: "open" | "closed";
  private _revealAt: string;

  private constructor(title: string, revealAt: string) {
    this._title = title;
    this._status = "open";
    this._revealAt = revealAt;
  }

  static create(title: string, revealAt?: string): VoteSession {
    if (!title.trim()) {
      throw new Error("제목은 비어있을 수 없습니다");
    }
    const reveal = revealAt
      ? new Date(revealAt).toISOString()
      : defaultRevealAt();
    return new VoteSession(title, reveal);
  }

  get title(): string {
    return this._title;
  }

  get revealAt(): string {
    return this._revealAt;
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

  isRevealed(): boolean {
    return new Date() >= new Date(this._revealAt);
  }
}
