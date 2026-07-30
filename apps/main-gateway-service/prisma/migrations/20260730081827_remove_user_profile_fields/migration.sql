/*
  Warnings:

  - You are about to drop the column `homePage` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `userName` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "homePage",
DROP COLUMN "userName";
