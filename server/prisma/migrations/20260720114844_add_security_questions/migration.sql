/*
  Warnings:

  - Added the required column `securityAnswer` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `securityQuestion` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "securityAnswer" TEXT NOT NULL,
ADD COLUMN     "securityQuestion" TEXT NOT NULL;
