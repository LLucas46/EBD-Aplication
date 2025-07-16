/*
  Warnings:

  - Made the column `dataNascimento` on table `alunos` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "alunos" ALTER COLUMN "dataNascimento" SET NOT NULL;
