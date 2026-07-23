-- AlterEnum
ALTER TYPE "ConnectionProvider" ADD VALUE 'GOOGLE';

-- AlterTable
ALTER TABLE "account_connections" ADD COLUMN     "external_account_email" TEXT,
ADD COLUMN     "external_account_name" TEXT;
