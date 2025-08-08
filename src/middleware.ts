import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/sidebar-demo(.*)'
]);

const isApiRoute = createRouteMatcher(['/api(.*)']);

export default clerkMiddleware(async (auth, req) => {
  // Se for uma rota da API, verificar autenticação
  if (isApiRoute(req)) {
    // Permitir webhooks sem autenticação
    if (req.nextUrl.pathname.startsWith('/api/webhooks')) {
      return;
    }
    
    // Para outras rotas da API, exigir autenticação
    try {
      const { userId } = await auth();
      
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }), 
          { 
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      return;
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }

  // Para rotas da aplicação, usar proteção padrão do Clerk
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};