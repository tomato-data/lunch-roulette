import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/drizzle/schema";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  const { nickname } = await req.json();

  if (!nickname?.trim()) {
    return NextResponse.json({ error: "닉네임을 입력해주세요" }, { status: 400 });
  }

  const id = randomUUID();
  const user = getDb()
    .insert(users)
    .values({ id, nickname: nickname.trim() })
    .returning()
    .get();

  return NextResponse.json(user, { status: 201 });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id 필요" }, { status: 400 });
  }

  const user = getDb().select().from(users).where(eq(users.id, id)).get();
  if (!user) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다" }, { status: 404 });
  }

  return NextResponse.json(user);
}
