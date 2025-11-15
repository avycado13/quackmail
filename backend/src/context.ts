export interface Context {
  userId?: string
  token?: string
}

// The context creator receives a Hono context via the adapter
export const createContext = async (context: any) => {
  // Extract userId and token from Hono context set by authMiddleware
  const userId = context.get?.('userId')
  const token = context.get?.('token')
  
  return {
    userId,
    token,
  }
}
