
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import prisma from '../config/prisma';
import { parseDateStringDMY } from '../utils/dateUtils';

interface CreateAlunoBody {
  nomeCompleto: string;
  classeId: number;
  dataNascimento: string; 
  ativo?: boolean;
}

interface UpdateAlunoBody {
  nomeCompleto?: string;
  classeId?: number;
  dataNascimento?: string; // Se fornecido, deve ser "DD/MM/AAAA". Não pode ser null.
  ativo?: boolean;
}

// Função auxiliar (manter como estava)
async function verificarClassePertenceAIgreja(classeId: number, igrejaIdDoAdmin: number): Promise<boolean> {
  const classe = await prisma.classe.findUnique({
    where: { id: classeId },
    include: { escola: { include: { superintendencia: true } } },
  });
  return !!(classe && classe.escola.superintendencia.igrejaId === igrejaIdDoAdmin);
}


// @desc    Criar novo Aluno
// @route   POST /api/alunos
// @access  Private (ADMIN_IGREJA)
export const createAluno = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { nomeCompleto, classeId, dataNascimento, ativo }: CreateAlunoBody = req.body;
  const igrejaId = req.user?.igrejaId;

  // ⬅️ dataNascimento agora é obrigatório na validação inicial
  if (!nomeCompleto || !classeId || !dataNascimento) {
    res.status(400).json({ message: 'Nome completo, ID da classe e data de nascimento são obrigatórios.' });
    return;
  }
  if (!igrejaId) {
    res.status(401).json({ message: 'ID da Igreja não encontrado no token do usuário.' });
    return;
  }

  const parsedDataNascimento = parseDateStringDMY(dataNascimento);
  if (!parsedDataNascimento) { // ⬅️ Se a data fornecida for inválida, é um erro, pois é obrigatória
    res.status(400).json({ message: `Formato de dataNascimento inválido: '${dataNascimento}'. Use DD/MM/AAAA.` });
    return;
  }

  try {
    if (!await verificarClassePertenceAIgreja(Number(classeId), igrejaId)) {
      res.status(400).json({ message: 'Classe inválida ou não pertence à sua igreja.' });
      return;
    }

    const novoAluno = await prisma.aluno.create({
      data: {
        nomeCompleto,
        classeId: Number(classeId),
        dataNascimento: parsedDataNascimento, // Usar a data convertida (agora sempre válida)
        ativo: ativo !== undefined ? ativo : true,
      },
      include: {
        classe: { select: { nomeTurma: true, id: true } },
      },
    });
    res.status(201).json(novoAluno);
  } catch (error) {
    console.error("Erro ao criar aluno:", error);
    if (error instanceof Error && error.message.includes("Invalid `prisma.aluno.create()` invocation")) {
        if (error.message.includes("Foreign key constraint failed on the field: `Aluno_classeId_fkey`")) {
             res.status(400).json({ message: `Classe com ID ${classeId} não encontrada.` });
             return;
        }
    }
    if (!res.headersSent) {
      res.status(500).json({ message: 'Erro interno ao criar aluno.' });
    }
  }
};

// ... (getAlunosByClasse e getAlunoById permanecem os mesmos) ...
// @desc    Listar todos os Alunos de uma Classe específica
// @route   GET /api/alunos?classeId=X
// @access  Private (ADMIN_IGREJA)
export const getAlunosByClasse = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { classeId: classeIdQuery } = req.query;
  const igrejaId = req.user?.igrejaId;

  if (!classeIdQuery) {
    res.status(400).json({ message: 'O parâmetro classeId é obrigatório na query string.' });
    return;
  }
  if (!igrejaId) {
    res.status(401).json({ message: 'ID da Igreja não encontrado no token do usuário.' });
    return;
  }

  const classeIdNum = Number(classeIdQuery);

  try {
    if (!await verificarClassePertenceAIgreja(classeIdNum, igrejaId)) {
      res.status(404).json({ message: 'Classe não encontrada ou não pertence à sua igreja.' });
      return;
    }

    const alunos = await prisma.aluno.findMany({
      where: {
        classeId: classeIdNum,
      },
      orderBy: {
        nomeCompleto: 'asc',
      },
    });
    res.status(200).json(alunos);
  } catch (error) {
    console.error("Erro ao buscar alunos por classe:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Erro interno ao buscar alunos.' });
    }
  }
};

// @desc    Obter detalhes de um Aluno
// @route   GET /api/alunos/:id
// @access  Private (ADMIN_IGREJA)
export const getAlunoById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  const igrejaId = req.user?.igrejaId;

  if (!igrejaId) {
    res.status(401).json({ message: 'ID da Igreja não encontrado no token do usuário.' });
    return;
  }

  try {
    const aluno = await prisma.aluno.findUnique({
      where: { id: Number(id) },
      include: {
        classe: { include: { escola: { include: { superintendencia: true } } } },
      },
    });

    if (!aluno || aluno.classe.escola.superintendencia.igrejaId !== igrejaId) {
      res.status(404).json({ message: 'Aluno não encontrado ou não pertence à sua igreja.' });
      return;
    }
    res.status(200).json(aluno);
  } catch (error) {
    console.error("Erro ao buscar aluno por ID:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Erro interno ao buscar aluno.' });
    }
  }
};


// @desc    Atualizar um Aluno
// @route   PUT /api/alunos/:id
// @access  Private (ADMIN_IGREJA)
export const updateAluno = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  const { nomeCompleto, classeId, dataNascimento, ativo }: UpdateAlunoBody = req.body;
  const igrejaId = req.user?.igrejaId;

  if (!igrejaId) {
    res.status(401).json({ message: 'ID da Igreja não encontrado no token do usuário.' });
    return;
  }
  if (Object.keys(req.body).length === 0) {
    res.status(400).json({ message: 'Nenhum dado fornecido para atualização.' });
    return;
  }

  let parsedDataNascimento: Date | undefined = undefined;
  if (dataNascimento) { // Se dataNascimento for fornecida para atualização
    const tempDate = parseDateStringDMY(dataNascimento);
    if (!tempDate) { // Se o formato for inválido, é um erro
      res.status(400).json({ message: `Formato de dataNascimento inválido: '${dataNascimento}'. Use DD/MM/AAAA.` });
      return;
    }
    parsedDataNascimento = tempDate;
  }
  // Se dataNascimento não for fornecida no corpo da requisição de PUT, parsedDataNascimento permanecerá undefined,
  // e o campo dataNascimento no banco não será alterado.

  try {
    const alunoExistente = await prisma.aluno.findUnique({
      where: { id: Number(id) },
      include: { classe: { include: { escola: { include: { superintendencia: true } } } } },
    });

    if (!alunoExistente || alunoExistente.classe.escola.superintendencia.igrejaId !== igrejaId) {
      res.status(404).json({ message: 'Aluno não encontrado ou não pertence à sua igreja para atualização.' });
      return;
    }

    const dataToUpdate: {
        nomeCompleto?: string;
        classeId?: number;
        dataNascimento?: Date; // Não pode ser null aqui se o campo no DB não é nullable
        ativo?: boolean;
    } = {};

    if (nomeCompleto !== undefined) dataToUpdate.nomeCompleto = nomeCompleto;
    if (ativo !== undefined) dataToUpdate.ativo = ativo;
    
    if (parsedDataNascimento !== undefined) { // Só atualiza se uma data válida foi fornecida
        dataToUpdate.dataNascimento = parsedDataNascimento;
    }

    if (classeId !== undefined) {
      if (!await verificarClassePertenceAIgreja(Number(classeId), igrejaId)) {
        res.status(400).json({ message: 'Nova classe inválida ou não pertence à sua igreja.' });
        return;
      }
      dataToUpdate.classeId = Number(classeId);
    }

    const alunoAtualizado = await prisma.aluno.update({
      where: { id: Number(id) },
      data: dataToUpdate,
      include: { classe: { select: { nomeTurma: true, id: true } } },
    });
    res.status(200).json(alunoAtualizado);
  } catch (error) {
    console.error("Erro ao atualizar aluno:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Erro interno ao atualizar aluno.' });
    }
  }
};

// deleteAluno permanece o mesmo
// @desc    Deletar um Aluno (ou marcar como inativo)
// @route   DELETE /api/alunos/:id
// @access  Private (ADMIN_IGREJA)
export const deleteAluno = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  const igrejaId = req.user?.igrejaId;

  if (!igrejaId) {
    res.status(401).json({ message: 'ID da Igreja não encontrado no token do usuário.' });
    return;
  }

  try {
    const alunoExistente = await prisma.aluno.findUnique({
      where: { id: Number(id) },
      include: { classe: { include: { escola: { include: { superintendencia: true } } } } },
    });

    if (!alunoExistente || alunoExistente.classe.escola.superintendencia.igrejaId !== igrejaId) {
      res.status(404).json({ message: 'Aluno não encontrado ou não pertence à sua igreja para deleção.' });
      return;
    }
    
    await prisma.aluno.delete({
      where: { id: Number(id) },
    });
    res.status(200).json({ message: 'Aluno deletado com sucesso.' });

  } catch (error) {
    console.error("Erro ao deletar aluno:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Erro interno ao deletar aluno.' });
    }
  }
};
