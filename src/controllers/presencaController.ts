
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import prisma from '../config/prisma';
import { PapelUsuario } from '@prisma/client';

// Interface para o corpo da requisição de registo de presença
interface AlunoPresencaStatus {
  alunoId: number;
  presente: boolean;
  observacao?: string;
}
interface RegistrarPresencaBody {
  classeId: number;
  dataAula: string; // Esperado no formato "DD/MM/AAAA"
  presencas: AlunoPresencaStatus[];
}

// Função para converter data DMY que já deve ter em utils
import { parseDateStringDMY } from '../utils/dateUtils';


// Função auxiliar para verificar se o utilizador (professor ou admin) pode gerir a classe
async function verificarPermissaoParaClasse(classeId: number, user: AuthenticatedRequest['user']): Promise<boolean> {
  if (!user) return false;

  const classe = await prisma.classe.findUnique({
    where: { id: classeId },
    include: { escola: { include: { superintendencia: true } } },
  });

  // Se a classe não existe ou não pertence à igreja do utilizador, acesso negado
  if (!classe || classe.escola.superintendencia.igrejaId !== user.igrejaId) {
    return false;
  }

  // Se o utilizador for ADMIN_IGREJA, tem permissão
  if (user.papel === PapelUsuario.ADMIN_IGREJA) {
    return true;
  }

  // Se for PROFESSOR, verificar se ele está associado à classe
  if (user.papel === PapelUsuario.PROFESSOR) {
    // Verificar se é o professor principal
    if (classe.professorPrincipalId === user.userId) {
      return true;
    }
    // Verificar se está na tabela de junção ProfessorPorClasse
    const associacao = await prisma.professorPorClasse.findUnique({
      where: {
        usuarioId_classeId: {
          usuarioId: user.userId,
          classeId: classeId,
        },
      },
    });
    return !!associacao;
  }

  return false;
}


// @desc    Registar presença para múltiplos alunos
// @route   POST /api/presencas
// @access  Private (ADMIN_IGREJA, PROFESSOR)
export const registrarPresenca = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { classeId, dataAula, presencas }: RegistrarPresencaBody = req.body;

  if (!classeId || !dataAula || !presencas || !Array.isArray(presencas)) {
    res.status(400).json({ message: 'classeId, dataAula e uma lista de presencas são obrigatórios.' });
    return;
  }

  const parsedDataAula = parseDateStringDMY(dataAula);
  if (!parsedDataAula) {
    res.status(400).json({ message: `Formato de dataAula inválido: '${dataAula}'. Use DD/MM/AAAA.` });
    return;
  }

  try {
    if (!await verificarPermissaoParaClasse(Number(classeId), req.user)) {
      res.status(403).json({ message: 'Acesso negado. Não tem permissão para gerir esta classe.' });
      return;
    }

    // Usar uma transação para garantir que todas as presenças são registadas (ou nenhuma é)
    const transacao = presencas.map(p => {
        // upsert: cria se não existir, atualiza se já existir (para a combinação alunoId/dataAula)
        // Precisamos de um índice único em `PresencaAluno` para (alunoId, dataAula) para isto funcionar
        // Vamos ajustar o schema para adicionar este índice único.
        return prisma.presencaAluno.upsert({
            where: {
                alunoId_dataAula: {
                    alunoId: Number(p.alunoId),
                    dataAula: parsedDataAula,
                }
            },
            update: { // Se já existe, atualiza o status de presença e observação
                presente: p.presente,
                observacao: p.observacao || null,
            },
            create: { // Se não existe, cria um novo registo
                alunoId: Number(p.alunoId),
                classeId: Number(classeId),
                dataAula: parsedDataAula,
                presente: p.presente,
                observacao: p.observacao || null,
            }
        });
    });

    const resultado = await prisma.$transaction(transacao);

    res.status(201).json({ message: `${resultado.length} registos de presença processados com sucesso.`, data: resultado });
  } catch (error) {
    console.error("Erro ao registar presenças:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Erro interno ao registar presenças.' });
    }
  }
};

// @desc    Obter histórico de presenças de uma classe
// @route   GET /api/presencas/classe/:classeId
// @access  Private (ADMIN_IGREJA, PROFESSOR)
export const getPresencasByClasse = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const { classeId } = req.params;
    const { dataInicial, dataFinal } = req.query; // Query strings

    if (!classeId) {
        res.status(400).json({ message: 'ID da Classe é obrigatório.' });
        return;
    }

    try {
        if (!await verificarPermissaoParaClasse(Number(classeId), req.user)) {
            res.status(403).json({ message: 'Acesso negado. Não tem permissão para ver esta classe.' });
            return;
        }

        let filtroData = {};
        if(dataInicial && dataFinal && typeof dataInicial === 'string' && typeof dataFinal === 'string') {
            const parsedDataInicial = parseDateStringDMY(dataInicial);
            const parsedDataFinal = parseDateStringDMY(dataFinal);
            if(parsedDataInicial && parsedDataFinal) {
                filtroData = {
                    dataAula: {
                        gte: parsedDataInicial, // gte = Greater Than or Equal (Maior ou Igual a)
                        lte: parsedDataFinal,   // lte = Less Than or Equal (Menor ou Igual a)
                    }
                }
            }
        }

        const presencas = await prisma.presencaAluno.findMany({
            where: {
                classeId: Number(classeId),
                ...filtroData
            },
            include: {
                aluno: { select: { id: true, nomeCompleto: true } }
            },
            orderBy: [
                { dataAula: 'desc' },
                { aluno: { nomeCompleto: 'asc' } }
            ]
        });

        res.status(200).json(presencas);

    } catch (error) {
        console.error("Erro ao obter histórico de presenças:", error);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Erro interno ao obter histórico de presenças.' });
        }
    }
};
