import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const TEST_EMAILS = [
  "onboarding-verify@careeros.test",
  "billing-verify@careeros.test",
  "launch-verify@careeros.test",
];

async function main() {
  const deleted = await prisma.profile.deleteMany({ where: { email: { in: TEST_EMAILS } } });
  console.log("Deleted orphaned test profile rows:", deleted.count);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
