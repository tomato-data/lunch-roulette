import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { restaurants } from "../drizzle/schema";

const sqlite = new Database("data/lunch-roulette.db");
const db = drizzle(sqlite);

const data = [
  // 구내식당
  { name: "밥온", category: "구내식당" },
  { name: "다시 봄", category: "구내식당" },

  // 돈가스
  { name: "정셰프", category: "돈가스" },
  { name: "카츠올로지", category: "돈가스" },

  // 쌀국수
  { name: "찐퍼", category: "쌀국수" },
  { name: "완삐마이", category: "쌀국수" },
  { name: "미안", category: "쌀국수" },
  { name: "카츠올로지 옆", category: "쌀국수" },
  { name: "디폴리스 2층 쌀국수", category: "쌀국수" },

  // 중식
  { name: "연", category: "중식" },
  { name: "보배반점", category: "중식" },
  { name: "탄탄멘", category: "중식" },

  // 일식
  { name: "은행골", category: "일식" },
  { name: "갓포소", category: "일식" },
  { name: "온센", category: "일식" },
  { name: "고칸", category: "일식" },

  // 라멘
  { name: "광명", category: "라멘" },
  { name: "민서쿠", category: "라멘" },

  // 한식
  { name: "금성", category: "한식" },
  { name: "효린이네", category: "한식" },
  { name: "청담옥", category: "한식" },
  { name: "디폴리스 2층 알탕", category: "한식" },
  { name: "배부장찌개", category: "한식" },
  { name: "망향 국수", category: "한식" },

  // 국밥
  { name: "순배순대국", category: "국밥" },
  { name: "소문난순대국", category: "국밥" },
  { name: "우림 지하 1층 국밥", category: "국밥" },

  // 우육면
  { name: "차찬텡 2층", category: "우육면" },
  { name: "우림 지하 1층 우육면", category: "우육면" },

  // 패스트푸드
  { name: "맥도날드", category: "패스트푸드" },
  { name: "왓더버거", category: "패스트푸드" },
  { name: "서브웨이", category: "패스트푸드" },
  { name: "도스마스", category: "패스트푸드" },

];

const now = new Date().toISOString();

db.insert(restaurants)
  .values(
    data.map((d) => ({
      name: d.name,
      category: d.category,
      createdAt: now,
      updatedAt: now,
    }))
  )
  .run();

console.log(`${data.length}개 식당 데이터 삽입 완료`);
sqlite.close();
