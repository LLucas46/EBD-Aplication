-- AlterEnum
ALTER TYPE "PapelUsuario" ADD VALUE 'SUPER_ADMIN';

-- AlterTable
ALTER TABLE "usuarios" ALTER COLUMN "igrejaId" DROP NOT NULL;
