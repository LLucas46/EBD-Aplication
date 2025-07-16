// Conteúdo para: backend/src/middlewares/planPermissionMiddleware.ts

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';
import prisma from '../config/prisma';

// Tipos para as nossas chaves de permissão, baseados nas suas imagens
export type PermissionKey = 'MAX_ALUNOS' | 'MAX_ESCOLAS' | 'MAX_CLASSES' | 'MAX_PROFESSORES';

// Esta função é um "gerador de middleware". Você passa a chave da permissão que quer verificar.
export const checkPlanPermission = (permissionKey: PermissionKey) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const igrejaId = req.user?.igrejaId;

    if (!igrejaId) {
      res.status(401).json({ message: 'ID da Igreja não encontrado no token do utilizador.' });
      return;
    }

    try {
      // 1. Obter o plano da igreja e as suas permissões associadas
      const igrejaComPlano = await prisma.igreja.findUnique({
        where: { id: igrejaId },
        include: {
          plano: {
            include: {
              permissoes: {
                include: {
                  permissao: true,
                },
              },
            },
          },
        },
      });
      
      if (!igrejaComPlano || !igrejaComPlano.plano) {
          res.status(403).json({ message: 'Plano da igreja não encontrado.' });
          return;
      }

      // 2. Encontrar a permissão específica que estamos a verificar
      const permissaoRequerida = igrejaComPlano.plano.permissoes.find(
        p => p.permissao.chave === permissionKey
      );

      if (!permissaoRequerida) {
        res.status(403).json({ message: `Ação não permitida. A permissão '${permissionKey}' não está incluída no seu plano.` });
        return;
      }
      
      const limite = permissaoRequerida.valorLimite;
      // Se o limite for null ou um valor muito alto (ex: 999999), consideramos ilimitado
      if (limite === null || limite >= 999999) {
          return next();
      }

      // 3. Contar o número atual de entidades relevantes
      let contagemAtual = 0;
      const nomeEntidade = permissionKey.split('_')[1].toLowerCase().replace('es', 'e');

      switch (permissionKey) {
        case 'MAX_ALUNOS':
          contagemAtual = await prisma.aluno.count({
            where: { classe: { escola: { superintendencia: { igrejaId: igrejaId } } } }
          });
          break;
        case 'MAX_ESCOLAS':
          contagemAtual = await prisma.escola.count({
            where: { superintendencia: { igrejaId: igrejaId } }
          });
          break;
        case 'MAX_CLASSES':
            contagemAtual = await prisma.classe.count({
                where: { escola: { superintendencia: { igrejaId: igrejaId } } }
            });
            break;
        case 'MAX_PROFESSORES':
            contagemAtual = await prisma.usuario.count({
                where: { igrejaId: igrejaId, papel: 'PROFESSOR' }
            });
            break;
        default:
          
         res.status(500).json({ message: `Chave de permissão desconhecida: ${permissionKey}`});
         return;
      }

      // 4. Comparar a contagem com o limite
      if (contagemAtual >= limite) {
        res.status(403).json({ message: `Limite de ${limite} ${nomeEntidade}(s) atingido. Faça um upgrade do seu plano para adicionar mais.` });
        return 
      }
      
      next();

    } catch (error) {
      console.error("Erro ao verificar permissão do plano:", error);
      res.status(500).json({ message: 'Erro interno ao verificar permissões.' });
    }
  };
};
