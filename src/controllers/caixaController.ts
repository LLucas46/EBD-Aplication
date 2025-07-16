// Conteúdo para: backend/src/controllers/caixaController.ts

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import prisma from '../config/prisma';
import { parseDateStringDMY } from '../utils/dateUtils';
import { Prisma } from '@prisma/client';

// Interface para o corpo da requisição de lançamento
interface LancarArrecadacaoBody {
  classeId: number;
  dataReuniaoCulto: string; // "DD/MM/AAAA"
  valorArrecadado: number;
}

// Função auxiliar atualizada para usar viewingIgrejaId
async function verificarPermissaoParaClasse(classeId: number, viewingIgrejaId: number | undefined): Promise<boolean> {
    if (!viewingIgrejaId) return false; // Se não estiver a visualizar nenhuma igreja, não tem permissão.
    const classe = await prisma.classe.findFirst({
        where: {
            id: classeId,
            escola: { superintendencia: { igrejaId: viewingIgrejaId } }
        }
    });
    return !!classe;
}

// @desc    Lançar uma nova arrecadação para uma classe
// @route   POST /api/caixa/lancamentos
// @access  Private (ADMIN_IGREJA, PROFESSOR)
export const lancarArrecadacao = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { classeId, dataReuniaoCulto, valorArrecadado }: LancarArrecadacaoBody = req.body;
  const registradoPorUsuarioId = req.user?.userId;
  const viewingIgrejaId = req.viewingIgrejaId; // CORREÇÃO: Usar a igreja que está a ser visualizada

  if (!classeId || !dataReuniaoCulto || valorArrecadado === undefined) {
    res.status(400).json({ message: 'ID da Classe, data da reunião e valor arrecadado são obrigatórios.' });
    return;
  }
  if (!registradoPorUsuarioId) {
    res.status(401).json({ message: 'ID do utilizador não encontrado no token.' });
    return;
  }
  
  const parsedDataReuniao = parseDateStringDMY(dataReuniaoCulto);
  if (!parsedDataReuniao) {
    res.status(400).json({ message: `Formato de data inválido: '${dataReuniaoCulto}'. Use DD/MM/AAAA.` });
    return;
  }

  try {
    // CORREÇÃO: Passar o viewingIgrejaId para a função de verificação
    if (!await verificarPermissaoParaClasse(Number(classeId), viewingIgrejaId)) {
        res.status(403).json({ message: 'Acesso negado. A classe não pertence à igreja que está a visualizar.' });
        return;
    }

    const novoLancamento = await prisma.arrecadacaoClasse.create({
      data: {
        classeId: Number(classeId),
        dataReuniaoCulto: parsedDataReuniao,
        valorArrecadado: valorArrecadado,
        registradoPorUsuarioId: registradoPorUsuarioId,
      },
    });
    res.status(201).json(novoLancamento);
  } catch (error) {
    console.error("Erro ao lançar arrecadação:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Erro interno ao lançar arrecadação.' });
    }
  }
};

// @desc    Obter lançamentos de arrecadação
// @route   GET /api/caixa/lancamentos?escolaId=X&classeId=Y...
// @access  Private (ADMIN_IGREJA, PROFESSOR)
export const getArrecadacoes = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const { escolaId, classeId, dataInicial, dataFinal } = req.query;
    const viewingIgrejaId = req.viewingIgrejaId; // CORREÇÃO: Usar a igreja que está a ser visualizada

    if (!viewingIgrejaId) {
        res.status(403).json({ message: 'Nenhuma igreja selecionada para visualização.' });
        return;
    }

    const where: Prisma.ArrecadacaoClasseWhereInput = {
        classe: { escola: { superintendencia: { igrejaId: viewingIgrejaId } } }
    };

    if (escolaId) {
        if (where.classe && where.classe.escola) {
            (where.classe.escola as Prisma.EscolaWhereInput).id = Number(escolaId);
        }
    }
    if (classeId) {
        where.classeId = Number(classeId);
    }
    if(dataInicial && dataFinal && typeof dataInicial === 'string' && typeof dataFinal === 'string') {
        const parsedDataInicial = parseDateStringDMY(dataInicial);
        const parsedDataFinal = parseDateStringDMY(dataFinal);
        if(parsedDataInicial && parsedDataFinal) {
            where.dataReuniaoCulto = { gte: parsedDataInicial, lte: parsedDataFinal };
        }
    }

    try {
        const arrecadacoes = await prisma.arrecadacaoClasse.findMany({
            where,
            include: {
                classe: { select: { nomeTurma: true, escola: { select: { nome: true } } } },
                registradoPor: { select: { nome: true } }
            },
            orderBy: { dataReuniaoCulto: 'desc' }
        });

        const resultado = arrecadacoes.map(a => ({
            ...a,
            valorArrecadado: Number(a.valorArrecadado)
        }));

        res.status(200).json(resultado);
    } catch (error) {
        console.error("Erro ao obter arrecadações:", error);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Erro interno ao obter arrecadações.' });
        }
    }
};

// @desc    Obter um resumo do caixa de uma escola
// @route   GET /api/caixa/resumo?escolaId=X
// @access  Private (ADMIN_IGREJA, PROFESSOR)
export const getResumoCaixa = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const { escolaId } = req.query;
    const viewingIgrejaId = req.viewingIgrejaId; // CORREÇÃO: Usar a igreja que está a ser visualizada

    if (!escolaId) {
        res.status(400).json({ message: 'O parâmetro escolaId é obrigatório na query string.' });
        return;
    }
    if (!viewingIgrejaId) {
        res.status(403).json({ message: 'Nenhuma igreja selecionada para visualização.' });
        return;
    }

    try {
        const escola = await prisma.escola.findFirst({
            where: { id: Number(escolaId), superintendencia: { igrejaId: viewingIgrejaId } },
            include: { classes: true }
        });
        if(!escola) {
            res.status(404).json({ message: 'Escola não encontrada ou não pertence à igreja que está a visualizar.' });
            return;
        }

        const totalEscola = await prisma.arrecadacaoClasse.aggregate({
            _sum: { valorArrecadado: true },
            where: { classe: { escolaId: Number(escolaId) } }
        });
        
        const trintaDiasAtras = new Date();
        trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

        const idsDasClasses = escola.classes.map(c => c.id);

        const arrecadacaoPorClasse30Dias = await prisma.arrecadacaoClasse.groupBy({
            by: ['classeId'],
            _sum: { valorArrecadado: true },
            where: {
                classeId: { in: idsDasClasses },
                dataReuniaoCulto: { gte: trintaDiasAtras }
            }
        });

        const classesInfo = await prisma.classe.findMany({
            where: { id: { in: arrecadacaoPorClasse30Dias.map(r => r.classeId) } },
            select: { id: true, nomeTurma: true }
        });
        const classesMap = new Map(classesInfo.map(c => [c.id, c.nomeTurma]));
        
        const resumoPorClasse = arrecadacaoPorClasse30Dias.map(r => ({
            classeId: r.classeId,
            nomeTurma: classesMap.get(r.classeId) || 'Desconhecida',
            total30dias: Number(r._sum.valorArrecadado)
        }));

        res.status(200).json({
            escolaId: Number(escolaId),
            nomeEscola: escola.nome,
            caixaTotalEscola: Number(totalEscola._sum.valorArrecadado) || 0,
            resumoClassesUltimos30Dias: resumoPorClasse
        });

    } catch(error) {
        console.error("Erro ao gerar resumo do caixa:", error);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Erro interno ao gerar resumo do caixa.' });
        }
    }
}
