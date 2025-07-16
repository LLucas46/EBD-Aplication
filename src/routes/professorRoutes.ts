// Conteúdo para: backend/src/routes/professorRoutes.ts

import { Router } from 'express';
import { protect, authorize } from '../middlewares/authMiddleware';
import { checkPlanPermission } from '../middlewares/planPermissionMiddleware';
import {
  createProfessor,
  getProfessoresByIgreja,
  getProfessorById,
  updateProfessor,
  deleteProfessor,
} from '../controllers/professorController';

const router = Router();

router.use(protect);
// CORREÇÃO: Permitir acesso para SUPER_ADMIN também
router.use(authorize('ADMIN_IGREJA', 'SUPER_ADMIN'));

router.route('/')
  .post(checkPlanPermission('MAX_PROFESSORES'), createProfessor)
  .get(getProfessoresByIgreja);

router.route('/:id')
  .get(getProfessorById)
  .put(updateProfessor)
  .delete(deleteProfessor);

export default router;
