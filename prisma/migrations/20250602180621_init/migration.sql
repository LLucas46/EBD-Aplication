-- CreateEnum
CREATE TYPE "PapelUsuario" AS ENUM ('ADMIN_IGREJA', 'ADMIN_ESCOLA', 'SUPERINTENDENTE', 'DIRETOR', 'PROFESSOR', 'EDITOR');

-- CreateTable
CREATE TABLE "planos" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "preco" DOUBLE PRECISION NOT NULL,
    "duracaoMeses" INTEGER NOT NULL DEFAULT 1,
    "descricao" TEXT,

    CONSTRAINT "planos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissoes" (
    "id" SERIAL NOT NULL,
    "chave" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,

    CONSTRAINT "permissoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plano_permissoes" (
    "planoId" INTEGER NOT NULL,
    "permissaoId" INTEGER NOT NULL,
    "valorLimite" INTEGER,

    CONSTRAINT "plano_permissoes_pkey" PRIMARY KEY ("planoId","permissaoId")
);

-- CreateTable
CREATE TABLE "igrejas" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "planoId" INTEGER NOT NULL,
    "dataInicioPlano" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataFimPlano" TIMESTAMP(3) NOT NULL,
    "adminPrincipalId" INTEGER,

    CONSTRAINT "igrejas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "papel" "PapelUsuario" NOT NULL,
    "igrejaId" INTEGER NOT NULL,
    "escolaAtivaId" INTEGER,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "superintendencias" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "igrejaId" INTEGER NOT NULL,

    CONSTRAINT "superintendencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escolas" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "superintendenciaId" INTEGER NOT NULL,
    "diretorId" INTEGER,

    CONSTRAINT "escolas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" SERIAL NOT NULL,
    "nomeTurma" TEXT NOT NULL,
    "escolaId" INTEGER NOT NULL,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professor_por_classe" (
    "usuarioId" INTEGER NOT NULL,
    "classeId" INTEGER NOT NULL,

    CONSTRAINT "professor_por_classe_pkey" PRIMARY KEY ("usuarioId","classeId")
);

-- CreateTable
CREATE TABLE "alunos" (
    "id" SERIAL NOT NULL,
    "nomeCompleto" TEXT NOT NULL,
    "dataNascimento" TIMESTAMP(3),
    "classeId" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "alunos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presencas_alunos" (
    "id" SERIAL NOT NULL,
    "alunoId" INTEGER NOT NULL,
    "classeId" INTEGER NOT NULL,
    "dataAula" TIMESTAMP(3) NOT NULL,
    "presente" BOOLEAN NOT NULL,
    "observacao" TEXT,

    CONSTRAINT "presencas_alunos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arrecadacoes_classe" (
    "id" SERIAL NOT NULL,
    "classeId" INTEGER NOT NULL,
    "dataReuniaoCulto" TIMESTAMP(3) NOT NULL,
    "valorArrecadado" DOUBLE PRECISION NOT NULL,
    "registradoPorUsuarioId" INTEGER NOT NULL,

    CONSTRAINT "arrecadacoes_classe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "planos_nome_key" ON "planos"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "permissoes_chave_key" ON "permissoes"("chave");

-- CreateIndex
CREATE UNIQUE INDEX "igrejas_adminPrincipalId_key" ON "igrejas"("adminPrincipalId");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- AddForeignKey
ALTER TABLE "plano_permissoes" ADD CONSTRAINT "plano_permissoes_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "planos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plano_permissoes" ADD CONSTRAINT "plano_permissoes_permissaoId_fkey" FOREIGN KEY ("permissaoId") REFERENCES "permissoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "igrejas" ADD CONSTRAINT "igrejas_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "planos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "igrejas" ADD CONSTRAINT "igrejas_adminPrincipalId_fkey" FOREIGN KEY ("adminPrincipalId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_igrejaId_fkey" FOREIGN KEY ("igrejaId") REFERENCES "igrejas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "superintendencias" ADD CONSTRAINT "superintendencias_igrejaId_fkey" FOREIGN KEY ("igrejaId") REFERENCES "igrejas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escolas" ADD CONSTRAINT "escolas_superintendenciaId_fkey" FOREIGN KEY ("superintendenciaId") REFERENCES "superintendencias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_escolaId_fkey" FOREIGN KEY ("escolaId") REFERENCES "escolas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professor_por_classe" ADD CONSTRAINT "professor_por_classe_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professor_por_classe" ADD CONSTRAINT "professor_por_classe_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alunos" ADD CONSTRAINT "alunos_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presencas_alunos" ADD CONSTRAINT "presencas_alunos_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presencas_alunos" ADD CONSTRAINT "presencas_alunos_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arrecadacoes_classe" ADD CONSTRAINT "arrecadacoes_classe_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arrecadacoes_classe" ADD CONSTRAINT "arrecadacoes_classe_registradoPorUsuarioId_fkey" FOREIGN KEY ("registradoPorUsuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
