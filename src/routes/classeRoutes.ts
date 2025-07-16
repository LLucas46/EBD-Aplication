// Conteúdo para: backend/src/routes/classeRoutes.ts

import { Router } from 'express';
import { protect, authorize } from '../middlewares/authMiddleware';
import { checkPlanPermission } from '../middlewares/planPermissionMiddleware';
import {
  createClasse,
  getClassesByEscola,
  getClasseById,
  updateClasse,
  deleteClasse,
  addProfessorToClasse,
  removeProfessorFromClasse,
  getProfessoresDaClasse,
} from '../controllers/classeController';

const router = Router();

router.use(protect);
// CORREÇÃO: Permitir acesso para SUPER_ADMIN também
router.use(authorize('ADMIN_IGREJA', 'SUPER_ADMIN'));

router.route('/')
  .post(checkPlanPermission('MAX_CLASSES'), createClasse)
  .get(getClassesByEscola);

router.route('/:id')
  .get(getClasseById)
  .put(updateClasse)
  .delete(deleteClasse);

router.route('/:classeId/professores')
  .post(addProfessorToClasse)
  .get(getProfessoresDaClasse);

router.route('/:classeId/professores/:professorId')
  .delete(removeProfessorFromClasse);

export default router;
