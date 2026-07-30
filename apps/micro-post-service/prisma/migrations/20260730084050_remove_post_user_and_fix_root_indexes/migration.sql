/*
  Warnings:

  - You are about to drop the `PostUser` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_userId_fkey";

-- DropIndex
DROP INDEX "Post_parentId_createdAt_id_idx";

-- DropIndex
DROP INDEX "Post_parentId_email_id_idx";

-- DropIndex
DROP INDEX "Post_parentId_userName_id_idx";

-- DropTable
DROP TABLE "PostUser";

-- Root cursor indexes contain only the sort value and the unique tie-breaker.
CREATE INDEX "Post_root_createdAt_id_idx"
ON "Post" ("createdAt", "id")
WHERE "parentId" IS NULL AND "deletedAt" IS NULL;

CREATE INDEX "Post_root_userName_id_idx"
ON "Post" ("userName", "id")
WHERE "parentId" IS NULL AND "deletedAt" IS NULL;

CREATE INDEX "Post_root_email_id_idx"
ON "Post" ("email", "id")
WHERE "parentId" IS NULL AND "deletedAt" IS NULL;
