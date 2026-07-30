/*
  Warnings:

  - You are about to drop the column `email` on the `PostUser` table. All the data in the column will be lost.
  - You are about to drop the column `userName` on the `PostUser` table. All the data in the column will be lost.
  - Added the required column `email` to the `Post` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userName` to the `Post` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Post_parentId_idx";

-- DropIndex
DROP INDEX "PostUser_email_id_idx";

-- DropIndex
DROP INDEX "PostUser_userName_id_idx";

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "homePage" TEXT,
ADD COLUMN     "userName" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PostUser" DROP COLUMN "email",
DROP COLUMN "userName";

-- CreateIndex
CREATE INDEX "Post_parentId_createdAt_id_idx" ON "Post"("parentId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Post_parentId_userName_id_idx" ON "Post"("parentId", "userName", "id");

-- CreateIndex
CREATE INDEX "Post_parentId_email_id_idx" ON "Post"("parentId", "email", "id");
