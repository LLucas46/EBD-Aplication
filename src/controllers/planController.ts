// Conteúdo para: backend/src/controllers/planController.ts

import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';

// @desc    Obter todos os Planos disponíveis
// @route   GET /api/plans
// @access  Público
export const getPlans = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const plans = await prisma.plano.findMany({
            orderBy: {
                preco: 'asc' // Ordenar por preço, do mais barato para o mais caro
            }
        });
        res.status(200).json(plans);
    } catch (error) {
        console.error("Erro ao buscar planos:", error);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Erro interno ao buscar os planos.' });
        }
    }
};
