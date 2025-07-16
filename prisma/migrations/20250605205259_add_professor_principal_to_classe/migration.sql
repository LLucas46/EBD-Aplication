-- AlterTable
ALTER TABLE "classes" ADD COLUMN     "professorPrincipalId" INTEGER;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_professorPrincipalId_fkey" FOREIGN KEY ("professorPrincipalId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
