// Conteúdo para: backend/src/controllers/authController.ts

import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { hashPassword, comparePassword } from '../utils/authUtils';
import jwt from 'jsonwebtoken';
import { PapelUsuario } from '@prisma/client';

// Interface para o corpo da requisição de registo da Igreja e Admin
interface RegisterChurchAdminBody {
  churchName: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  planId: number;
}

// Função para registar uma nova Igreja com o seu Administrador Principal (sem alterações)
export const registerChurchWithAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const {
    churchName,
    adminName,
    adminEmail,
    adminPassword,
    planId,
  }: RegisterChurchAdminBody = req.body;

  try {
    if (!churchName || !adminName || !adminEmail || !adminPassword || !planId) {
      res.status(400).json({ message: 'Todos os campos são obrigatórios, incluindo planId.' });
      return;
    }

    const planExists = await prisma.plano.findUnique({
      where: { id: Number(planId) },
    });

    if (!planExists) {
      res.status(404).json({ message: `Plano com ID ${planId} não encontrado.` });
      return;
    }

    const existingAdmin = await prisma.usuario.findUnique({
      where: { email: adminEmail },
    });

    if (existingAdmin) {
      res.status(409).json({ message: 'Este email de administrador já está em uso.' });
      return;
    }

    const hashedPassword = await hashPassword(adminPassword);
    const dataInicioPlano = new Date();
    const dataFimPlano = new Date(dataInicioPlano);
    dataFimPlano.setMonth(dataFimPlano.getMonth() + planExists.duracaoMeses);

    const result = await prisma.$transaction(async (tx) => {
      const novaIgreja = await tx.igreja.create({
        data: {
          nome: churchName,
          planoId: Number(planId),
          dataInicioPlano: dataInicioPlano,
          dataFimPlano: dataFimPlano,
        },
      });

      const novoAdmin = await tx.usuario.create({
        data: {
          nome: adminName,
          email: adminEmail,
          senhaHash: hashedPassword,
          papel: PapelUsuario.ADMIN_IGREJA,
          igrejaId: novaIgreja.id,
        },
      });

      const igrejaAtualizada = await tx.igreja.update({
        where: { id: novaIgreja.id },
        data: { adminPrincipalId: novoAdmin.id },
        include: {
          adminPrincipal: true,
          plano: true,
        }
      });
      return igrejaAtualizada;
    });

    res.status(201).json({
      message: 'Igreja e Administrador registados com sucesso!',
      igreja: {
        id: result.id,
        nome: result.nome,
        plano: result.plano,
        adminPrincipal: {
          id: result.adminPrincipal?.id,
          nome: result.adminPrincipal?.nome,
          email: result.adminPrincipal?.email,
        }
      }
    });

  } catch (error) {
    console.error("Erro ao registar igreja e admin:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Erro interno ao registar igreja e administrador.' });
    }
  }
};


// Interface para o corpo da requisição de Login
interface LoginUserBody {
  email: string;
  password: string;
}

// Função para login de Utilizador (Admin, Professor ou Super Admin)
export const loginUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { email, password }: LoginUserBody = req.body;

  try {
    if (!email || !password) {
      res.status(400).json({ message: 'Email e palavra-passe são obrigatórios.' });
      return;
    }

    const user = await prisma.usuario.findUnique({
      where: { email: email },
      include: {
        igreja: {
          select: {
            id: true,
            nome: true
          }
        }
      }
    });

    if (!user) {
      res.status(401).json({ message: 'Credenciais inválidas.' });
      return;
    }

    // CORREÇÃO: Adicionar SUPER_ADMIN à lista de papéis permitidos para login
    const allowedLoginRoles: PapelUsuario[] = [PapelUsuario.ADMIN_IGREJA, PapelUsuario.PROFESSOR, PapelUsuario.SUPER_ADMIN];
    if (!allowedLoginRoles.includes(user.papel)) {
        res.status(403).json({ message: `Login não permitido para o papel '${user.papel}'.` });
        return;
    }

    const isPasswordValid = await comparePassword(password, user.senhaHash);

    if (!isPasswordValid) {
      res.status(401).json({ message: 'Credenciais inválidas.' });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('Erro crítico: JWT_SECRET não está definido no .env');
      res.status(500).json({ message: 'Erro de configuração do servidor.' });
      return;
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        papel: user.papel,
        igrejaId: user.igrejaId, // Será null para o Super Admin, o que está correto
      },
      jwtSecret,
      { expiresIn: '1d' }
    );

    res.status(200).json({
      message: 'Login bem-sucedido!',
      token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        papel: user.papel,
        igreja: user.igreja
      },
    });

  } catch (error) {
    console.error("Erro no login:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Erro interno ao tentar fazer login.' });
    }
  }
};
