/*
  Warnings:

  - A unique constraint covering the columns `[alunoId,dataAula]` on the table `presencas_alunos` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "presencas_alunos_alunoId_dataAula_key" ON "presencas_alunos"("alunoId", "dataAula");
