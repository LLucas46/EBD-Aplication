// Conteúdo para: backend/src/routes/alunoRoutes.ts

import { Router } from 'express';
import { protect, authorize } from '../middlewares/authMiddleware';
import { checkPlanPermission } from '../middlewares/planPermissionMiddleware';
import {
  createAluno,
  getAlunosByClasse,
  getAlunoById,
  updateAluno,
  deleteAluno,
} from '../controllers/alunoController';

const router = Router();

router.use(protect);
// CORREÇÃO: Permitir acesso para SUPER_ADMIN também
router.use(authorize('ADMIN_IGREJA', 'SUPER_ADMIN'));

router.route('/')
  .post(checkPlanPermission('MAX_ALUNOS'), createAluno)
  .get(getAlunosByClasse);

router.route('/:id')
  .get(getAlunoById)
  .put(updateAluno)
  .delete(deleteAluno);

export default router;
