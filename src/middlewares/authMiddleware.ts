// Conteúdo para: backend/src/middlewares/authMiddleware.ts

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Estendendo a interface Request do Express
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    email: string;
    papel: string;
    igrejaId: number | null; // igrejaId pode ser null para SUPER_ADMIN
  };
  // Nova propriedade para saber qual igreja visualizar
  viewingIgrejaId?: number; 
}

export const protect = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new Error('JWT_SECRET não está configurado no servidor.');
      }

      const decoded = jwt.verify(token, jwtSecret) as AuthenticatedRequest['user'];
      req.user = decoded; // Anexar dados do token ao request

      // LÓGICA DE PERMISSÃO DE VISUALIZAÇÃO
      if (req.user?.papel === 'SUPER_ADMIN') {
        // Se for SUPER_ADMIN, ele deve enviar a igreja que quer ver num cabeçalho
        const viewingChurchIdHeader = req.headers['x-viewing-church-id'];
        if (viewingChurchIdHeader) {
          req.viewingIgrejaId = Number(viewingChurchIdHeader);
        }
        // Se não enviar o cabeçalho, viewingIgrejaId ficará undefined.
        // As rotas podem decidir o que fazer (ex: pedir para selecionar uma igreja).
      } else {
        // Para utilizadores normais, eles só podem ver a sua própria igreja.
        if (req.user?.igrejaId) {
            req.viewingIgrejaId = req.user.igrejaId;
        } else {
             // Um utilizador normal sem igrejaId não pode ver nada
             res.status(403).json({ message: 'Utilizador sem igreja associada não tem permissão.' });
             return;
        }
      }

      next();
    } catch (error) {
      res.status(401).json({ message: 'Não autorizado, token falhou.' });
      return;
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Não autorizado, nenhum token fornecido.' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.papel || !roles.includes(req.user.papel)) {
      res.status(403).json({ message: `Acesso negado. Papel '${req.user?.papel}' não autorizado.` });
      return;
    }
    next();
  };
};
