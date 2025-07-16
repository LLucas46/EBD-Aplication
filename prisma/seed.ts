// Conteúdo para: backend/prisma/seed.ts

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('A iniciar o processo de seeding...');

  // 1. Limpar dados antigos na ORDEM CORRETA E EXPLÍCITA para evitar erros
  // Começar pelas tabelas de junção e com as dependências mais profundas
  await prisma.planoPermissao.deleteMany({});
  await prisma.arrecadacaoClasse.deleteMany({});
  await prisma.presencaAluno.deleteMany({});
  await prisma.professorPorClasse.deleteMany({});

  // Agora as entidades que dependem das de cima
  await prisma.aluno.deleteMany({});

  // Agora as classes, que já não têm alunos ou presenças
  await prisma.classe.deleteMany({});
  
  // Agora as escolas, que já não têm classes
  await prisma.escola.deleteMany({});

  // Agora as superintendências, que já não têm escolas
  await prisma.superintendencia.deleteMany({});

  // Agora os usuários. Se houvesse uma igreja, eles seriam apagados em cascata,
  // mas vamos ser explícitos. O `adminPrincipalId` na Igreja é opcional, então não há problema.
  await prisma.usuario.deleteMany({});

  // Agora a igreja, que já não tem dependências de superintendência ou usuário
  await prisma.igreja.deleteMany({});

  // Finalmente, os planos e permissões, que já não têm nenhuma referência
  await prisma.plano.deleteMany({});
  await prisma.permissao.deleteMany({});

  console.log('Dados antigos limpos com sucesso.');


  // 2. Criar Permissões
  const p1 = await prisma.permissao.create({ data: { chave: 'MAX_ALUNOS', descricao: 'Limite máximo de alunos' } });
  const p2 = await prisma.permissao.create({ data: { chave: 'MAX_CLASSES', descricao: 'Limite máximo de classes' } });
  const p3 = await prisma.permissao.create({ data: { chave: 'MAX_PROFESSORES', descricao: 'Limite máximo de professores' } });
  const p4 = await prisma.permissao.create({ data: { chave: 'MAX_ESCOLAS', descricao: 'Limite máximo de escolas' } });
  console.log('Permissões criadas.');

  // 3. Criar Planos
  const plano1 = await prisma.plano.create({ data: { nome: 'Plano Básico', preco: 50.00, duracaoMeses: 1, descricao: '1 escola, 1 classe, 1 professor, 50 alunos' } });
  const plano2 = await prisma.plano.create({ data: { nome: 'Plano Intermediário', preco: 100.00, duracaoMeses: 1, descricao: '1 escola, 2 classes, múltiplos professores, 100 alunos' } });
  const plano3 = await prisma.plano.create({ data: { nome: 'Plano Avançado', preco: 150.00, duracaoMeses: 1, descricao: 'Múltiplas escolas, classes, professores e alunos ilimitados' } });
  console.log('Planos criados.');

  // 4. Associar Permissões aos Planos
  // Plano Básico
  await prisma.planoPermissao.createMany({
    data: [
      { planoId: plano1.id, permissaoId: p1.id, valorLimite: 50 },    // 50 alunos
      { planoId: plano1.id, permissaoId: p2.id, valorLimite: 1 },     // 1 classe
      { planoId: plano1.id, permissaoId: p3.id, valorLimite: 1 },     // 1 professor
      { planoId: plano1.id, permissaoId: p4.id, valorLimite: 1 },     // 1 escola
    ],
  });
  // Plano Intermediário
  await prisma.planoPermissao.createMany({
    data: [
      { planoId: plano2.id, permissaoId: p1.id, valorLimite: 100 },   // 100 alunos
      { planoId: plano2.id, permissaoId: p2.id, valorLimite: 2 },     // 2 classes
      { planoId: plano2.id, permissaoId: p3.id, valorLimite: null },  // Professores ilimitados
      { planoId: plano2.id, permissaoId: p4.id, valorLimite: 1 },     // 1 escola
    ],
  });
  // Plano Avançado
  await prisma.planoPermissao.createMany({
    data: [
      { planoId: plano3.id, permissaoId: p1.id, valorLimite: null },  // Alunos ilimitados
      { planoId: plano3.id, permissaoId: p2.id, valorLimite: null },  // Classes ilimitadas
      { planoId: plano3.id, permissaoId: p3.id, valorLimite: null },  // Professores ilimitados
      { planoId: plano3.id, permissaoId: p4.id, valorLimite: null },  // Escolas ilimitadas
    ],
  });
  console.log('Associações Plano-Permissão criadas.');

  console.log('Seeding concluído com sucesso.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
