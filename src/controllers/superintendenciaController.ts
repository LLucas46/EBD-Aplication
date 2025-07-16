// Conteúdo para: backend/src/controllers/superintendenciaController.ts

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import prisma from '../config/prisma';
import { PapelUsuario } from '@prisma/client';

// @desc    Listar Superintendências (com Escolas e Classes aninhadas)
// @route   GET /api/superintendencias
// @access  Private (ADMIN_IGREJA, SUPER_ADMIN)
export const getSuperintendencias = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { user, viewingIgrejaId } = req;

  if (!user) {
    res.status(401).json({ message: 'Utilizador não autenticado.' });
    return;
  }
  
  // Se for admin normal, precisa de uma igreja selecionada
  if (user.papel === 'ADMIN_IGREJA' && !viewingIgrejaId) {
    res.status(403).json({ message: 'Nenhuma igreja selecionada para visualização.' });
    return;
  }

  try {
    const whereClause = user.papel === 'SUPER_ADMIN' 
        ? {} // Super Admin vê tudo
        : { igrejaId: viewingIgrejaId }; // Admin normal vê apenas a sua igreja

    const superintendencias = await prisma.superintendencia.findMany({
      where: whereClause,
      include: {
        igreja: { select: { nome: true } }, // Para contexto do Super Admin
        escolas: {
          orderBy: { nome: 'asc' },
          include: {
            classes: {
              orderBy: { nomeTurma: 'asc' },
              include: {
                professorPrincipal: { select: { id: true, nome: true } }
              }
            }
          }
        }
      },
      orderBy: {
        nome: 'asc'
      }
    });
    res.status(200).json(superintendencias);
  } catch (error) {
    console.error("Erro ao buscar superintendências:", error);
     if (!res.headersSent) {
      res.status(500).json({ message: 'Erro interno ao buscar superintendências.' });
    }
  }
};

// Mantenha as outras funções do seu controller (create, getById, update, delete) aqui...
// ...
export const createSuperintendencia = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => { /* ...código existente... */ };
export const getSuperintendenciaById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => { /* ...código existente... */ };
export const updateSuperintendencia = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => { /* ...código existente... */ };
export const deleteSuperintendencia = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => { /* ...código existente... */ };
