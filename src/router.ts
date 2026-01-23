import { createRouter, createWebHistory } from 'vue-router';
import LandingPageV2 from './components/LandingPageV2.vue';
import AuthPage from './components/AuthPage.vue';
import App from './components/App.vue';
import DashboardPage from './components/DashboardPage.vue';
import { useAuthStore } from './store/auth';

let authInitialized = false;

const routes = [
  {
    path: '/',
    name: 'Landing',
    component: LandingPageV2,
  },
  {
    path: '/login',
    name: 'Login',
    component: AuthPage,
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: DashboardPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/app',
    name: 'Application',
    component: App,
    meta: { requiresAuth: true },
  },
  // Catch-all: redirect to dashboard if logged in, otherwise to landing
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    redirect: () => {
      const authStore = useAuthStore();
      return authStore.isAuthenticated ? '/dashboard' : '/';
    },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Navigation guard for protected routes
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore();

  // Wait for auth to initialize on first navigation (handles redirect result)
  if (!authInitialized) {
    await authStore.initAuth();
    authInitialized = true;
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    // Redirect to login page if not authenticated
    next('/login');
  } else if ((to.path === '/' || to.path === '/login') && authStore.isAuthenticated) {
    // Redirect authenticated users from landing/login to dashboard
    next('/dashboard');
  } else {
    next();
  }
});

export default router;
