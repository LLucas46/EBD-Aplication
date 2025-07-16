// Conteúdo para: backend/src/controllers/escolaController.ts

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import prisma from '../config/prisma';
import { Prisma } from '@prisma/client';

// Interfaces (sem alterações)
interface CreateEscolaBody {
  nome: string;
  superintendenciaId: number;
  diretorId?: number;
}
interface UpdateEscolaBody {
  nome?: string;
  superintendenciaId?: number;
  diretorId?: number | null;
}

// createEscola, getEscolaById, updateEscola, deleteEscola (sem alterações, mas devem estar no ficheiro)
export const createEscola = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => { /* ... o seu código existente aqui ... */ };
export const getEscolaById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => { /* ... o seu código existente aqui ... */ };
export const updateEscola = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => { /* ... o seu código existente aqui ... */ };
export const deleteEscola = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => { /* ... o seu código existente aqui ... */ };


// @desc    Listar todas as Escolas (com filtro opcional)
// @route   GET /api/escolas?superintendenciaId=X
// @access  Private (ADMIN_IGREJA, SUPER_ADMIN)
export const getEscolasByIgreja = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const viewingIgrejaId = req.viewingIgrejaId;
  const { superintendenciaId } = req.query;

  try {
    const where: Prisma.EscolaWhereInput = {};
    
    // LÓGICA CORRIGIDA
    if (req.user?.papel === 'SUPER_ADMIN') {
        // Se for Super Admin, ele pode filtrar por superintendência diretamente,
        // independentemente da igreja.
        if (superintendenciaId) {
            where.superintendenciaId = Number(superintendenciaId);
        }
        // Se não houver filtro de superintendência, ele verá TODAS as escolas.
    } else {
        // Para um admin normal, os resultados são SEMPRE restritos à sua igreja.
        if (!viewingIgrejaId) {
            res.status(403).json({ message: 'Nenhuma igreja selecionada para visualização.' });
            return;
        }
        where.superintendencia = { igrejaId: viewingIgrejaId };
        
        // Ele também pode filtrar por uma superintendência específica dentro da sua igreja.
        if (superintendenciaId) {
            where.superintendenciaId = Number(superintendenciaId);
        }
    }

    const escolas = await prisma.escola.findMany({
      where,
      include: {
        superintendencia: {
          select: { nome: true }
        },
      },
      orderBy: {
        nome: 'asc'
      }
    });
    res.status(200).json(escolas);
  } catch (error) {
    console.error("Erro ao buscar escolas:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Erro interno ao buscar escolas.' });
    }
  }
};
