// Conteúdo para: backend/src/routes/escolaRoutes.ts

import { Router } from 'express';
import { protect, authorize } from '../middlewares/authMiddleware';
import { checkPlanPermission } from '../middlewares/planPermissionMiddleware';
import {
  createEscola,
  getEscolasByIgreja,
  getEscolaById,
  updateEscola,
  deleteEscola,
} from '../controllers/escolaController';

const router = Router();

router.use(protect);
// CORREÇÃO: Permitir acesso para SUPER_ADMIN também
router.use(authorize('ADMIN_IGREJA', 'SUPER_ADMIN'));

router.route('/')
  .post(checkPlanPermission('MAX_ESCOLAS'), createEscola)
  .get(getEscolasByIgreja);

router.route('/:id')
  .get(getEscolaById)
  .put(updateEscola)
  .delete(deleteEscola);

export default router;
