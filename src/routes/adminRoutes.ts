import { Router } from 'express';
import { protect, authorize } from '../middlewares/authMiddleware';
import { getAllChurches } from '../controllers/adminController';

const router = Router();

// Todas as rotas aqui são protegidas e só para SUPER_ADMIN
router.use(protect);
router.use(authorize('SUPER_ADMIN'));

// Rota para o Super Admin obter a lista de todas as igrejas
router.route('/churches').get(getAllChurches);

export default router;
