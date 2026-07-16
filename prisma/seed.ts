/**
 * Database seed script — run with `npm run db:seed`.
 *
 * Kept intentionally empty of feature data. Add idempotent `upsert` calls
 * here as domain models are introduced.
 */
import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  console.log("No seed data defined yet.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
