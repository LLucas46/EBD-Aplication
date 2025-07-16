// Conteúdo para: backend/src/routes/authRoutes.ts (ATUALIZAR NOME DA FUNÇÃO)

import { Router } from 'express';
// Importe loginUser em vez de loginAdmin
import {registerChurchWithAdmin, loginUser } from '../controllers/authController';

const router = Router();

router.post('/register-church-admin', registerChurchWithAdmin);
router.post('/login', loginUser); // Usar loginUser aqui

export default router;
