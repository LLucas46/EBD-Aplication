// Conteúdo para: backend/src/controllers/adminController.ts
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import prisma from '../config/prisma';

export const getAllChurches = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const churches = await prisma.igreja.findMany({
            select: { id: true, nome: true },
            orderBy: { nome: 'asc' }
        });
        res.status(200).json(churches);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar igrejas.' });
    }
};
