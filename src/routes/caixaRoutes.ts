// Conteúdo para: backend/src/routes/caixaRoutes.ts

import { Router } from 'express';
import { protect, authorize } from '../middlewares/authMiddleware';
import {
  lancarArrecadacao,
  getArrecadacoes,
  getResumoCaixa,
} from '../controllers/caixaController'; // Criaremos este controller a seguir

const router = Router();

// Todas as rotas aqui serão protegidas
router.use(protect);
// Vamos autorizar ADMIN_IGREJA e PROFESSOR a realizar operações de caixa por enquanto
router.use(authorize('ADMIN_IGREJA', 'PROFESSOR'));

// Rota para lançar um novo valor arrecadado
// POST /api/caixa/lancamentos
router.route('/lancamentos').post(lancarArrecadacao);

// Rota para obter lançamentos (filtrados por classe, escola, datas, etc. via query string)
// GET /api/caixa/lancamentos?escolaId=X&classeId=Y&dataInicial=DD/MM/AAAA&dataFinal=DD/MM/AAAA
router.route('/lancamentos').get(getArrecadacoes);

// Rota para obter um resumo dos totais (total da escola, totais por classe, últimos 30 dias)
// GET /api/caixa/resumo?escolaId=X
router.route('/resumo').get(getResumoCaixa);


export default router;
