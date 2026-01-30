<template>
  <nav class="app-header">
    <div class="header-container">
      <div class="header-left">
        <button class="header-brand" @click="goHome" type="button" aria-label="Go to home page">
          <svg class="logo" viewBox="0 0 32 32" fill="none">
            <rect x="4" y="4" width="10" height="10" rx="2" fill="currentColor"/>
            <rect x="18" y="4" width="10" height="10" rx="2" fill="currentColor" opacity="0.7"/>
            <rect x="4" y="18" width="10" height="10" rx="2" fill="currentColor" opacity="0.5"/>
            <rect x="18" y="18" width="10" height="10" rx="2" fill="currentColor" opacity="0.3"/>
          </svg>
          <span class="brand-name">RADSIM</span>
        </button>

        <!-- Navigation links (shown on landing page) -->
        <div v-if="isLandingPage" class="header-nav">
          <a href="#features" class="nav-link" @click.prevent="scrollToSection('features')">Features</a>
          <a href="#testimonials" class="nav-link" @click.prevent="scrollToSection('testimonials')">Testimonials</a>
          <a href="#pricing" class="nav-link" @click.prevent="scrollToSection('pricing')">Pricing</a>
        </div>
      </div>

      <div class="header-actions">
        <!-- Loading state -->
        <div v-if="authStore.loading" class="user-loading">
          <div class="loading-dot"></div>
        </div>

        <!-- Show user avatar if signed in -->
        <template v-else-if="authStore.isAuthenticated">
          <!-- Plan badge -->
          <span class="plan-badge" :class="planBadgeClass">
            {{ planLabel }}
          </span>

          <div class="user-profile" @click="toggleDropdown">
            <img
              v-if="authStore.userProfile?.photoURL"
              :src="authStore.userProfile.photoURL"
              :alt="authStore.userProfile.displayName || 'User'"
              class="user-avatar"
              referrerpolicy="no-referrer"
            />
            <div v-else class="user-avatar-placeholder">
              {{ initials }}
            </div>
            <span class="user-name">{{ firstName }}</span>
            <svg class="chevron" :class="{ open: showDropdown }" width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>

          <!-- Dropdown menu -->
          <Transition name="dropdown">
            <div v-if="showDropdown" class="dropdown-menu">
              <div class="dropdown-header">
                <img
                  v-if="authStore.userProfile?.photoURL"
                  :src="authStore.userProfile.photoURL"
                  :alt="authStore.userProfile.displayName || 'User'"
                  class="dropdown-avatar"
                  referrerpolicy="no-referrer"
                />
                <div v-else class="dropdown-avatar-placeholder">
                  {{ initials }}
                </div>
                <div class="dropdown-info">
                  <span class="dropdown-name">{{ authStore.userProfile?.displayName || 'User' }}</span>
                  <span class="dropdown-email">{{ authStore.userProfile?.email }}</span>
                </div>
              </div>
              <div class="dropdown-divider"></div>
              <button class="dropdown-item" @click="handleSignOut">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>Sign out</span>
              </button>
            </div>
          </Transition>

          <!-- Click outside to close dropdown -->
          <div v-if="showDropdown" class="dropdown-overlay" @click="showDropdown = false"></div>
        </template>

        <!-- Show sign in button if not signed in -->
        <template v-else>
          <button class="btn-login" @click="handleSignIn">Sign in</button>
        </template>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/src/store/auth';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const showDropdown = ref(false);

const isLandingPage = computed(() => route.path === '/');

const initials = computed(() => {
  const name = authStore.userProfile?.displayName || authStore.userProfile?.email || 'U';
  return name.charAt(0).toUpperCase();
});

const firstName = computed(() => {
  const name = authStore.userProfile?.displayName || '';
  return name.split(' ')[0] || 'User';
});

const isPro = computed(() => {
  return authStore.userProfile?.subscriptionTier === 'pro';
});

const planLabel = computed(() => {
  return isPro.value ? 'Pro' : 'Free';
});

const planBadgeClass = computed(() => {
  return isPro.value ? 'plan-pro' : 'plan-free';
});

function toggleDropdown() {
  showDropdown.value = !showDropdown.value;
}

function goHome() {
  router.push('/');
}

function scrollToSection(sectionId: string) {
  const element = document.getElementById(sectionId);
  if (element) {
    const headerHeight = 72;
    const elementPosition = element.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({
      top: elementPosition - headerHeight,
      behavior: 'smooth'
    });
  }
}

function handleSignIn() {
  // Navigate to login page where user can choose auth method
  router.push('/login');
}

async function handleSignOut() {
  showDropdown.value = false;
  try {
    await authStore.signOut();
    router.push('/');
  } catch (error) {
    console.error('Sign out failed:', error);
  }
}

onMounted(() => {
  authStore.initAuth();
});
</script>

<style scoped>
.app-header {
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
}

.header-container {
  max-width: 1920px;
  margin: 0 auto;
  padding: 0 48px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 48px;
}

.header-nav {
  display: flex;
  align-items: center;
  gap: 32px;
}

.nav-link {
  font-size: 14px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  transition: color 0.2s ease;
  letter-spacing: -0.01em;
}

.nav-link:hover {
  color: #FFFFFF;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: opacity 0.2s ease;
  background: none;
  border: none;
  padding: 0;
}

.header-brand:hover {
  opacity: 0.8;
}

.logo {
  color: #FFFFFF;
  width: 36px;
  height: 36px;
}

.brand-name {
  font-size: 21px;
  font-weight: 600;
  color: #FFFFFF;
  letter-spacing: -0.5px;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  position: relative;
}

/* Loading state */
.user-loading {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-dot {
  width: 8px;
  height: 8px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.4; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1); }
}

/* User Profile (when signed in) */
.user-profile {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px 6px 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 980px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.user-profile:hover {
  background: rgba(255, 255, 255, 0.15);
}

.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.user-avatar-placeholder {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #5b7dff 0%, #667eea 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 12px;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: #FFFFFF;
}

.chevron {
  color: rgba(255, 255, 255, 0.6);
  transition: transform 0.2s ease;
}

.chevron.open {
  transform: rotate(180deg);
}

/* Dropdown */
.dropdown-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 260px;
  background: #1a1a1a;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  z-index: 1001;
}

.dropdown-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
}

.dropdown-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
}

.dropdown-avatar-placeholder {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, #5b7dff 0%, #667eea 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 18px;
}

.dropdown-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.dropdown-name {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dropdown-email {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dropdown-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 16px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.dropdown-item:hover {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.95);
}

/* Dropdown animation */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.95);
}

/* Sign in/out buttons */
.btn-login {
  background: transparent;
  border: none;
  color: #FFFFFF;
  font-size: 14px;
  font-weight: 400;
  padding: 8px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 980px;
}

.btn-login:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* Plan badge */
.plan-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 980px;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.plan-free {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.plan-pro {
  background: linear-gradient(135deg, #0A84FF 0%, #5E5CE6 100%);
  color: #FFFFFF;
  border: none;
}

/* Responsive */
@media (max-width: 768px) {
  .header-container {
    padding: 0 24px;
    height: 60px;
  }

  .header-nav {
    display: none;
  }

  .brand-name {
    font-size: 18px;
  }

  .logo {
    width: 28px;
    height: 28px;
  }

  .user-name {
    display: none;
  }
}
</style>
