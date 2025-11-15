import { Context, Next } from 'hono';
import { authService } from '../services/authService';

export async function authMiddleware(c: Context<any>, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Missing authorization header' }, 401);
  }

  const token = authHeader.substring(7);

  try {
    const { userId } = await authService.verifyToken(token);
    c.set('userId', userId);
    c.set('token', token);
    await next();
  } catch (error) {
    return c.json({ error: 'Invalid token' }, 401);
  }
}
