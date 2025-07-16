// Conteúdo para: backend/src/routes/presencaRoutes.ts

import { Router } from 'express';
import { protect, authorize } from '../middlewares/authMiddleware';
import {
  registrarPresenca,
  getPresencasByClasse,
} from '../controllers/presencaController'; // Criaremos este controller a seguir

const router = Router();

// Todas as rotas aqui serão protegidas e acessíveis por ADMIN_IGREJA e PROFESSOR
router.use(protect);
router.use(authorize('ADMIN_IGREJA', 'PROFESSOR'));

// Rota para registar a presença de múltiplos alunos numa classe e data
// POST /api/presencas
router.route('/').post(registrarPresenca);

// Rota para obter o histórico de presenças de uma classe
// GET /api/presencas/classe/:classeId?dataInicial=YYYY-MM-DD&dataFinal=YYYY-MM-DD
router.route('/classe/:classeId').get(getPresencasByClasse);

export default router;
