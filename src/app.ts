// Conteúdo para: backend/src/app.ts

import express, { Express, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
dotenv.config();

import authRoutes from './routes/authRoutes';
import superintendenciaRoutes from './routes/superintendenciaRoutes';
import escolaRoutes from './routes/escolaRoutes';
import classeRoutes from './routes/classeRoutes';
import alunoRoutes from './routes/alunoRoutes';
import professorRoutes from './routes/professorRoutes';
import presencaRoutes from './routes/presencaRoutes';
import caixaRoutes from './routes/caixaRoutes';
import planRoutes from './routes/planRoutes'; 
import adminRoutes from './routes/adminRoutes'; 

const app: Express = express();
const port: string | number = process.env.PORT || 3001;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api', (req: Request, res: Response) => {
  res.status(200).json({ message: 'API Escola Dominical Funcionando com TypeScript!' });
});

// Use as suas rotas aqui
app.use('/api/plans', planRoutes); 
app.use('/api/auth', authRoutes);
app.use('/api/superintendencias', superintendenciaRoutes);
app.use('/api/escolas', escolaRoutes);
app.use('/api/classes', classeRoutes);
app.use('/api/alunos', alunoRoutes);
app.use('/api/professores', professorRoutes);
app.use('/api/presencas', presencaRoutes);
app.use('/api/caixa', caixaRoutes);
app.use('/api/admin', adminRoutes); 

// Middleware de tratamento de erros
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("ERRO DETECTADO PELO HANDLER GLOBAL:", err.stack);
  const statusCode = (err as any).statusCode || 500;
  const message = err.message || 'Algo deu errado no servidor!';
  res.status(statusCode).json({ message, error: err.message });
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port} em http://localhost:${port}`);
});

export default app;
