import { createRouter, createWebHistory } from 'vue-router';
import LandingPageV2 from './components/LandingPageV2.vue';
import AuthPage from './components/AuthPage.vue';
import VerifyEmail from './components/VerifyEmail.vue';
import App from './components/App.vue';
import DashboardPage from './components/DashboardPage.vue';
import PrivacyPolicy from './components/PrivacyPolicy.vue';
import TermsOfService from './components/TermsOfService.vue';
import { useAuthStore } from './store/auth';
import { useLearningStore } from './store/learning';

let authInitialized = false;
let learningStoreInitialized = false;

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
    path: '/verify-email',
    name: 'VerifyEmail',
    component: VerifyEmail,
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
  {
    path: '/privacy',
    name: 'Privacy',
    component: PrivacyPolicy,
  },
  {
    path: '/terms',
    name: 'Terms',
    component: TermsOfService,
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
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }
    return { top: 0 };
  },
});

// Navigation guard for protected routes
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore();

  // Wait for auth to initialize on first navigation (handles redirect result)
  if (!authInitialized) {
    await authStore.initAuth();
    authInitialized = true;

    // Register learning store to reload data when user changes
    if (!learningStoreInitialized) {
      const learningStore = useLearningStore();
      authStore.onAuthChange(() => {
        learningStore.onAuthStateChange();
      });
      // Also load data for current user now
      learningStore.loadLearningData();
      learningStoreInitialized = true;
    }
  }

  const user = authStore.user;

  if (to.meta.requiresAuth) {
    if (!authStore.isAuthenticated) {
      // Redirect to login page if not authenticated
      next('/login');
    } else if (user && !user.emailVerified && user.providerData[0]?.providerId === 'password') {
      // Redirect to login if email not verified (only for email/password users)
      next('/login');
    } else {
      next();
    }
  } else if ((to.path === '/' || to.path === '/login') && authStore.isAuthenticated) {
    // Only redirect to dashboard if email is verified (or using OAuth provider)
    if (user && (user.emailVerified || user.providerData[0]?.providerId !== 'password')) {
      next('/dashboard');
    } else {
      next();
    }
  } else {
    next();
  }
});

export default router;
