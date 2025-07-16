
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import prisma from '../config/prisma';
import { PapelUsuario } from '@prisma/client';

// --- Interfaces existentes ---
interface CreateClasseBody {
  nomeTurma: string;
  escolaId: number;
  professorPrincipalId?: number;
}
interface UpdateClasseBody {
  nomeTurma?: string;
  escolaId?: number;
  professorPrincipalId?: number | null;
}
// --- Nova Interface ---
interface AddProfessorToClasseBody {
  professorId: number;
}

// --- Funções Auxiliares existentes ---
async function verificarEscolaPertenceAIgreja(escolaId: number, igrejaIdDoAdmin: number): Promise<boolean> {
  const escola = await prisma.escola.findUnique({
    where: { id: escolaId },
    include: { superintendencia: true },
  });
  return !!(escola && escola.superintendencia.igrejaId === igrejaIdDoAdmin);
}
async function verificarProfessorValido(professorId: number, igrejaIdDoAdmin: number): Promise<boolean> {
  const professor = await prisma.usuario.findUnique({
    where: { id: professorId },
  });
  return !!(professor && professor.igrejaId === igrejaIdDoAdmin && professor.papel === PapelUsuario.PROFESSOR);
}
// Função auxiliar para verificar se a classe pertence à igreja do admin
async function verificarClassePertenceAIgreja(classeId: number, igrejaIdDoAdmin: number): Promise<boolean> {
    const classe = await prisma.classe.findUnique({
        where: { id: classeId },
        include: { escola: { include: { superintendencia: true } } }
    });
    return !!(classe && classe.escola && classe.escola.superintendencia && classe.escola.superintendencia.igrejaId === igrejaIdDoAdmin);
}


// --- Funções CRUD de Classe existentes (createClasse, getClassesByEscola, getClasseById, updateClasse, deleteClasse) ---
// Mantenha as suas funções CRUD de Classe aqui como estavam (já incluem a lógica do professorPrincipalId)
// Vou omiti-las aqui por brevidade, mas elas DEVEM PERMANECER NO SEU FICHEIRO.
export const createClasse = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { nomeTurma, escolaId, professorPrincipalId }: CreateClasseBody = req.body;
  const igrejaId = req.user?.igrejaId;

  if (!nomeTurma || !escolaId) {
    res.status(400).json({ message: 'Nome da turma e ID da escola são obrigatórios.' });
    return;
  }
  if (!igrejaId) {
    res.status(401).json({ message: 'ID da Igreja não encontrado no token do utilizador.' });
    return;
  }

  try {
    if (!await verificarEscolaPertenceAIgreja(Number(escolaId), igrejaId)) {
      res.status(400).json({ message: 'Escola inválida ou não pertence à sua igreja.' });
      return;
    }

    if (professorPrincipalId !== undefined && professorPrincipalId !== null) {
        if (!await verificarProfessorValido(Number(professorPrincipalId), igrejaId)) {
            res.status(400).json({ message: 'Professor principal inválido, não encontrado, não é professor ou não pertence à sua igreja.' });
            return;
        }
    }

    const novaClasse = await prisma.classe.create({
      data: {
        nomeTurma,
        escolaId: Number(escolaId),
        professorPrincipalId: professorPrincipalId ? Number(professorPrincipalId) : null,
      },
      include: {
        escola: { select: { nome: true, id: true } },
        professorPrincipal: { select: { id: true, nome: true, email: true } },
      }
    });
    res.status(201).json(novaClasse);
  } catch (error) {
    console.error("Erro ao criar classe:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Erro interno ao criar classe.' });
    }
  }
};
export const getClassesByEscola = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { escolaId: escolaIdQuery } = req.query;
  const igrejaId = req.user?.igrejaId;

  if (!escolaIdQuery) {
    res.status(400).json({ message: 'O parâmetro escolaId é obrigatório na query string.' });
    return;
  }
  if (!igrejaId) {
    res.status(401).json({ message: 'ID da Igreja não encontrado no token do utilizador.' });
    return;
  }
  const escolaIdNum = Number(escolaIdQuery);

  try {
    if (!await verificarEscolaPertenceAIgreja(escolaIdNum, igrejaId)) {
      res.status(404).json({ message: 'Escola não encontrada ou não pertence à sua igreja.' });
      return;
    }

    const classes = await prisma.classe.findMany({
      where: { escolaId: escolaIdNum },
      include: {
        professorPrincipal: { select: { id: true, nome: true } }
      },
      orderBy: { nomeTurma: 'asc' }
    });
    res.status(200).json(classes);
  } catch (error) {
    console.error("Erro ao buscar classes por escola:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Erro interno ao buscar classes.' });
    }
  }
};
export const getClasseById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  const igrejaId = req.user?.igrejaId;

  if (!igrejaId) {
    res.status(401).json({ message: 'ID da Igreja não encontrado no token do utilizador.' });
    return;
  }

  try {
    const classe = await prisma.classe.findUnique({
      where: { id: Number(id) },
      include: {
        escola: { include: { superintendencia: true } },
        professorPrincipal: { select: { id: true, nome: true, email: true } },
        professores: { include: { usuario: { select: {id: true, nome: true, email: true}}}},
        alunos: { where: { ativo: true }, select: { id: true, nomeCompleto: true }, orderBy: { nomeCompleto: 'asc'}},
      }
    });

    if (!classe || !classe.escola || !classe.escola.superintendencia || classe.escola.superintendencia.igrejaId !== igrejaId) {
      res.status(404).json({ message: 'Classe não encontrada ou não pertence à sua igreja.' });
      return;
    }
    res.status(200).json(classe);
  } catch (error) {
    console.error("Erro ao buscar classe por ID:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Erro interno ao buscar classe.' });
    }
  }
};
export const updateClasse = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  const { nomeTurma, escolaId, professorPrincipalId }: UpdateClasseBody = req.body;
  const igrejaId = req.user?.igrejaId;

  if (!igrejaId) {
    res.status(401).json({ message: 'ID da Igreja não encontrado no token do utilizador.' });
    return;
  }
  if (Object.keys(req.body).length === 0) {
    res.status(400).json({ message: 'Nenhum dado fornecido para atualização.' });
    return;
  }

  try {
    const classeExistente = await prisma.classe.findUnique({
      where: { id: Number(id) },
      include: { escola: { include: { superintendencia: true } } }
    });

    if (!classeExistente || !classeExistente.escola || !classeExistente.escola.superintendencia || classeExistente.escola.superintendencia.igrejaId !== igrejaId) {
      res.status(404).json({ message: 'Classe não encontrada ou não pertence à sua igreja para atualização.' });
      return;
    }

    const dataToUpdate: {
        nomeTurma?: string;
        escolaId?: number;
        professorPrincipalId?: number | null;
    } = {};

    if (nomeTurma !== undefined) dataToUpdate.nomeTurma = nomeTurma;
    
    if (escolaId !== undefined) {
        if (!await verificarEscolaPertenceAIgreja(Number(escolaId), igrejaId)) {
            res.status(400).json({ message: 'Nova escola inválida ou não pertence à sua igreja.' });
            return;
        }
        dataToUpdate.escolaId = Number(escolaId);
    }

    if (professorPrincipalId === null) {
        dataToUpdate.professorPrincipalId = null;
    } else if (professorPrincipalId !== undefined) {
        if (!await verificarProfessorValido(Number(professorPrincipalId), igrejaId)) {
            res.status(400).json({ message: 'Professor principal inválido, não encontrado, não é professor ou não pertence à sua igreja.' });
            return;
        }
        dataToUpdate.professorPrincipalId = Number(professorPrincipalId);
    }

    const classeAtualizada = await prisma.classe.update({
      where: { id: Number(id) },
      data: dataToUpdate,
      include: { 
        escola: { select: { nome: true, id: true } },
        professorPrincipal: { select: { id: true, nome: true, email: true } },
       }
    });
    res.status(200).json(classeAtualizada);
  } catch (error) {
    console.error("Erro ao atualizar classe:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Erro interno ao atualizar classe.' });
    }
  }
};
export const deleteClasse = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  const igrejaId = req.user?.igrejaId;

  if (!igrejaId) {
    res.status(401).json({ message: 'ID da Igreja não encontrado no token do utilizador.' });
    return;
  }

  try {
    const classeExistente = await prisma.classe.findUnique({
      where: { id: Number(id) },
      include: { escola: { include: { superintendencia: true } } }
    });

    if (!classeExistente || !classeExistente.escola || !classeExistente.escola.superintendencia || classeExistente.escola.superintendencia.igrejaId !== igrejaId) {
      res.status(404).json({ message: 'Classe não encontrada ou não pertence à sua igreja para deleção.' });
      return;
    }
    
    await prisma.classe.delete({
      where: { id: Number(id) },
    });
    res.status(200).json({ message: 'Classe deletada com sucesso.' });
  } catch (error) {
    console.error("Erro ao deletar classe:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Erro interno ao deletar classe.' });
    }
  }
};


// --- Novas Funções para Múltiplos Professores ---

// @desc    Atribuir um Professor a uma Classe
// @route   POST /api/classes/:classeId/professores
// @access  Private (ADMIN_IGREJA)
export const addProfessorToClasse = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { classeId } = req.params;
  const { professorId }: AddProfessorToClasseBody = req.body;
  const igrejaId = req.user?.igrejaId;

  if (!professorId) {
    res.status(400).json({ message: 'ID do Professor é obrigatório.' });
    return;
  }
  if (!igrejaId) {
    res.status(401).json({ message: 'ID da Igreja não encontrado no token do utilizador.' });
    return;
  }

  try {
    if (!await verificarClassePertenceAIgreja(Number(classeId), igrejaId)) {
      res.status(404).json({ message: 'Classe não encontrada ou não pertence à sua igreja.' });
      return;
    }
    if (!await verificarProfessorValido(Number(professorId), igrejaId)) {
      res.status(400).json({ message: 'Professor inválido: não encontrado, não é professor, ou não pertence à sua igreja.' });
      return;
    }

    // Verificar se a associação já existe
    const existingAssociation = await prisma.professorPorClasse.findUnique({
      where: {
        usuarioId_classeId: {
          usuarioId: Number(professorId),
          classeId: Number(classeId),
        },
      },
    });

    if (existingAssociation) {
      res.status(409).json({ message: 'Este professor já está atribuído a esta classe.' });
      return;
    }

    const novaAssociacao = await prisma.professorPorClasse.create({
      data: {
        usuarioId: Number(professorId),
        classeId: Number(classeId),
      },
      include: {
        usuario: { select: { id: true, nome: true, email: true } },
        classe: { select: { id: true, nomeTurma: true } }
      }
    });
    res.status(201).json(novaAssociacao);
  } catch (error) {
    console.error("Erro ao adicionar professor à classe:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Erro interno ao adicionar professor à classe.' });
    }
  }
};

// @desc    Remover um Professor de uma Classe
// @route   DELETE /api/classes/:classeId/professores/:professorId
// @access  Private (ADMIN_IGREJA)
export const removeProfessorFromClasse = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { classeId, professorId } = req.params;
  const igrejaId = req.user?.igrejaId;

  if (!igrejaId) {
    res.status(401).json({ message: 'ID da Igreja não encontrado no token do utilizador.' });
    return;
  }

  try {
    if (!await verificarClassePertenceAIgreja(Number(classeId), igrejaId)) {
      res.status(404).json({ message: 'Classe não encontrada ou não pertence à sua igreja.' });
      return;
    }
    // Não é estritamente necessário verificar o professor aqui, pois o delete na tabela de junção falhará se não existir.
    // Mas podemos verificar para dar uma mensagem mais clara se o professorId não for válido.
    if (!await verificarProfessorValido(Number(professorId), igrejaId)) {
      res.status(400).json({ message: 'Professor inválido.' }); // Ou 404 se preferir
      return;
    }

    await prisma.professorPorClasse.delete({
      where: {
        usuarioId_classeId: {
          usuarioId: Number(professorId),
          classeId: Number(classeId),
        },
      },
    });
    res.status(200).json({ message: 'Professor removido da classe com sucesso.' });
  } catch (error: any) {
    console.error("Erro ao remover professor da classe:", error);
    if (error.code === 'P2025') { // Código de erro do Prisma para "Record to delete does not exist."
        res.status(404).json({ message: 'Associação professor-classe não encontrada para remoção.'});
    } else if (!res.headersSent) {
      res.status(500).json({ message: 'Erro interno ao remover professor da classe.' });
    }
  }
};

// @desc    Listar todos os Professores de uma Classe específica
// @route   GET /api/classes/:classeId/professores
// @access  Private (ADMIN_IGREJA)
export const getProfessoresDaClasse = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { classeId } = req.params;
  const igrejaId = req.user?.igrejaId;

  if (!igrejaId) {
    res.status(401).json({ message: 'ID da Igreja não encontrado no token do utilizador.' });
    return;
  }

  try {
    if (!await verificarClassePertenceAIgreja(Number(classeId), igrejaId)) {
      res.status(404).json({ message: 'Classe não encontrada ou não pertence à sua igreja.' });
      return;
    }

    const associacoes = await prisma.professorPorClasse.findMany({
      where: {
        classeId: Number(classeId),
      },
      include: {
        usuario: { select: { id: true, nome: true, email: true, papel: true } }, // Detalhes do professor
      },
      orderBy: {
        usuario: { nome: 'asc'}
      }
    });
    // Mapear para retornar apenas os dados dos usuários (professores)
    const professores = associacoes.map(assoc => assoc.usuario);
    res.status(200).json(professores);
  } catch (error) {
    console.error("Erro ao listar professores da classe:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Erro interno ao listar professores da classe.' });
    }
  }
};
