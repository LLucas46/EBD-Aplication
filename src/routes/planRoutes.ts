// Conteúdo para: backend/src/routes/planRoutes.ts

import { Router } from 'express';
import { getPlans } from '../controllers/planController';

const router = Router();

// Rota pública para obter a lista de planos de assinatura
router.route('/').get(getPlans);

export default router;
