// Configuration des routes pour la sécurité

// Routes publiques qui ne nécessitent pas d'authentification
export const PUBLIC_ROUTES = [
  '/pages/auth/login',
  '/pages/auth/register',
  '/pages/auth/verificationCode',
  '/(tabs)',
  '/+not-found',
] as const;

// Routes protégées qui nécessitent une authentification
export const PROTECTED_ROUTES = [
  '/pages/home/',
  '/pages/profil/',
  '/pages/Paiement/',
  '/pages/Reservation/',
  '/pages/TicketPage/',
  '/pages/views/',
  '/pages/models/',
  '/pages/controllers/',
] as const;

// Routes qui ne permettent pas le retour en arrière
export const NO_BACK_ROUTES = [
  '/pages/home/accueil',
  '/pages/auth/login',
  '/pages/auth/register',
] as const;

// Fonction pour vérifier si une route nécessite une authentification
export const isProtectedRoute = (route: string): boolean => {
  return PROTECTED_ROUTES.some(protectedRoute => 
    route.startsWith(protectedRoute)
  );
};

// Fonction pour vérifier si une route est publique
export const isPublicRoute = (route: string): boolean => {
  return PUBLIC_ROUTES.some(publicRoute => 
    route.startsWith(publicRoute)
  );
};

// Fonction pour vérifier si une route ne permet pas le retour
export const isNoBackRoute = (route: string): boolean => {
  return NO_BACK_ROUTES.some(noBackRoute => 
    route === noBackRoute
  );
};

// Configuration des redirections par défaut
export const DEFAULT_REDIRECTS = {
  authenticated: '/pages/home/accueil',
  unauthenticated: '/pages/auth/login',
} as const;

// Types pour une meilleure type safety
export type PublicRoute = typeof PUBLIC_ROUTES[number];
export type ProtectedRoute = string; // Plus flexible pour les routes dynamiques
export type NoBackRoute = typeof NO_BACK_ROUTES[number]; 