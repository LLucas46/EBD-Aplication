// Conteúdo para: backend/src/routes/superintendenciaRoutes.ts

import { Router } from 'express';
import { protect, authorize } from '../middlewares/authMiddleware';
import {
  createSuperintendencia,
  getSuperintendencias,
  getSuperintendenciaById,
  updateSuperintendencia,
  deleteSuperintendencia,
} from '../controllers/superintendenciaController';

const router = Router();

router.use(protect);
// CORREÇÃO: Permitir acesso para SUPER_ADMIN também
router.use(authorize('ADMIN_IGREJA', 'SUPER_ADMIN'));

router.route('/')
  .post(createSuperintendencia)
  .get(getSuperintendencias);

router.route('/:id')
  .get(getSuperintendenciaById)
  .put(updateSuperintendencia)
  .delete(deleteSuperintendencia);

export default router;