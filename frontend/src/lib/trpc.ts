import { createTRPCReact } from '@trpc/react-query'
import { httpBatchLink } from '@trpc/client'
import { inferRouterInputs, inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from 'backend/src/routers/index'

const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
        // browser should use relative url
        return ''
    }
    if (process.env.VERCEL_URL) {
        // SSR should use vercel url
        return `https://${process.env.VERCEL_URL}`
    }
    // dev SSR should use localhost
    return `http://localhost:3001`
}

export const trpc = createTRPCReact<AppRouter>()

// Type helpers for use in components
export type RouterInput = inferRouterInputs<AppRouter>
export type RouterOutput = inferRouterOutputs<AppRouter>

// Create client-side configuration
export const createTrpcClient = () =>
    trpc.createClient({
        links: [
            httpBatchLink({
                url: `${getBaseUrl()}/api/trpc`,
                // You can pass any HTTP headers you wish here
                async headers() {
                    return {
                        authorization: `Bearer ${localStorage.getItem('token') || ''}`,
                    }
                },
            }),
        ],
    })
