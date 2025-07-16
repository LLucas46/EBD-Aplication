// Conteúdo para: backend/src/controllers/professorController.ts

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import prisma from '../config/prisma';
import { hashPassword } from '../utils/authUtils';
import { PapelUsuario, Prisma } from '@prisma/client';

interface CreateProfessorBody {
  nome: string;
  email: string;
  senhaInicial: string;
}

interface UpdateProfessorBody {
  nome?: string;
  email?: string;
}

// @desc    Criar novo Professor (como um Usuário)
// @route   POST /api/professores
// @access  Private (ADMIN_IGREJA, SUPER_ADMIN)
export const createProfessor = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { nome, email, senhaInicial }: CreateProfessorBody = req.body;
  const viewingIgrejaId = req.viewingIgrejaId;

  if (!nome || !email || !senhaInicial) {
    res.status(400).json({ message: 'Nome, email e senha inicial são obrigatórios.' });
    return;
  }
  // Para criar um professor, é sempre necessário estar no contexto de uma igreja
  if (!viewingIgrejaId) {
    res.status(403).json({ message: 'É necessário selecionar uma igreja para criar um professor.' });
    return;
  }

  try {
    const existingUser = await prisma.usuario.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(409).json({ message: 'Este email já está em uso.' });
      return;
    }

    const senhaHash = await hashPassword(senhaInicial);

    const novoProfessor = await prisma.usuario.create({
      data: {
        nome,
        email,
        senhaHash,
        papel: PapelUsuario.PROFESSOR,
        igrejaId: viewingIgrejaId, // Associa o professor à igreja em visualização
      },
      select: { id: true, nome: true, email: true, papel: true, igrejaId: true }
    });
    res.status(201).json(novoProfessor);
  } catch (error) {
    console.error("Erro ao criar professor:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Erro interno ao criar professor.' });
    }
  }
};

// @desc    Listar todos os Professores
// @route   GET /api/professores
// @access  Private (ADMIN_IGREJA, SUPER_ADMIN)
export const getProfessoresByIgreja = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const viewingIgrejaId = req.viewingIgrejaId;
  const user = req.user;

  try {
    const where: Prisma.UsuarioWhereInput = {
        papel: PapelUsuario.PROFESSOR
    };
    
    if (user?.papel === 'SUPER_ADMIN') {
        if (viewingIgrejaId) {
            where.igrejaId = viewingIgrejaId;
        }
        // Se nenhuma igreja for selecionada, o Super Admin verá todos os professores de todas as igrejas
    } else {
        if (!viewingIgrejaId) {
            // Um admin normal deve sempre ter uma igreja. Se não tiver, retorna lista vazia ou erro.
            res.status(200).json([]);
            return;
        }
        where.igrejaId = viewingIgrejaId;
    }
    
    const professores = await prisma.usuario.findMany({
      where,
      select: { id: true, nome: true, email: true, papel: true },
      orderBy: { nome: 'asc' },
    });
    res.status(200).json(professores);
  } catch (error) {
    console.error("Erro ao buscar professores:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Erro interno ao buscar professores.' });
    }
  }
};


// @desc    Obter detalhes de um Professor
// @route   GET /api/professores/:id
// @access  Private (ADMIN_IGREJA, SUPER_ADMIN)
export const getProfessorById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  const viewingIgrejaId = req.viewingIgrejaId;

  try {
    const professor = await prisma.usuario.findUnique({
      where: { id: Number(id) },
      select: { id: true, nome: true, email: true, papel: true, igrejaId: true, classesLecionadas: { include: { classe: {select: {id: true, nomeTurma: true}} } } }
    });

    if (!professor || professor.papel !== PapelUsuario.PROFESSOR) {
        res.status(404).json({ message: 'Professor não encontrado.' });
        return;
    }

    // Se não for super admin, verificar se o professor pertence à sua igreja
    if (req.user?.papel !== 'SUPER_ADMIN' && (!viewingIgrejaId || professor.igrejaId !== viewingIgrejaId)) {
        res.status(403).json({ message: 'Acesso negado a este professor.' });
        return;
    }

    res.status(200).json(professor);
  } catch (error) {
    console.error("Erro ao buscar professor por ID:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Erro interno ao buscar professor.' });
    }
  }
};

// @desc    Atualizar um Professor
// @route   PUT /api/professores/:id
// @access  Private (ADMIN_IGREJA, SUPER_ADMIN)
export const updateProfessor = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  const { nome, email }: UpdateProfessorBody = req.body;
  const viewingIgrejaId = req.viewingIgrejaId;

  if (!nome && !email) {
    res.status(400).json({ message: 'Pelo menos um campo (nome ou email) é necessário para a atualização.' });
    return;
  }

  try {
    // Verificar se o professor existe e se o utilizador tem permissão sobre ele
    const professorExistente = await prisma.usuario.findUnique({
      where: { id: Number(id) },
    });

    if (!professorExistente || professorExistente.papel !== PapelUsuario.PROFESSOR) {
      res.status(404).json({ message: 'Professor não encontrado.' });
      return;
    }

    if (req.user?.papel !== 'SUPER_ADMIN' && (!viewingIgrejaId || professorExistente.igrejaId !== viewingIgrejaId)) {
      res.status(403).json({ message: 'Acesso negado para atualizar este professor.' });
      return;
    }
    
    // Se o email estiver a ser atualizado, verificar se já não existe para outro utilizador
    if (email) {
      const existingUserWithEmail = await prisma.usuario.findUnique({ where: { email } });
      if (existingUserWithEmail && existingUserWithEmail.id !== Number(id)) {
        res.status(409).json({ message: 'Este email já está em uso por outro utilizador.' });
        return;
      }
    }

    const dataToUpdate: UpdateProfessorBody = {};
    if (nome) dataToUpdate.nome = nome;
    if (email) dataToUpdate.email = email;

    const professorAtualizado = await prisma.usuario.update({
      where: { id: Number(id) },
      data: dataToUpdate,
      select: { id: true, nome: true, email: true, papel: true, igrejaId: true },
    });
    res.status(200).json(professorAtualizado);
  } catch (error) {
    console.error("Erro ao atualizar professor:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Erro interno ao atualizar professor.' });
    }
  }
};

// @desc    Deletar um Professor
// @route   DELETE /api/professores/:id
// @access  Private (ADMIN_IGREJA, SUPER_ADMIN)
export const deleteProfessor = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  const viewingIgrejaId = req.viewingIgrejaId;

  try {
    // Verificar se o professor existe e se o utilizador tem permissão sobre ele
    const professorExistente = await prisma.usuario.findUnique({
      where: { id: Number(id) },
    });

    if (!professorExistente || professorExistente.papel !== PapelUsuario.PROFESSOR) {
      res.status(404).json({ message: 'Professor não encontrado.' });
      return;
    }

    if (req.user?.papel !== 'SUPER_ADMIN' && (!viewingIgrejaId || professorExistente.igrejaId !== viewingIgrejaId)) {
      res.status(403).json({ message: 'Acesso negado para apagar este professor.' });
      return;
    }

    // Deletar o utilizador professor
    await prisma.usuario.delete({
      where: { id: Number(id) },
    });
    res.status(200).json({ message: 'Professor apagado com sucesso.' });
  } catch (error) {
    console.error("Erro ao apagar professor:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Erro interno ao apagar professor.' });
    }
  }
};
