<template>
  <div class="user-menu">
    <!-- Loading state -->
    <div v-if="authStore.loading" class="user-loading">
      <div class="loading-dot"></div>
    </div>

    <!-- Signed out state -->
    <button
      v-else-if="!authStore.isAuthenticated"
      class="sign-in-btn"
      @click="handleSignIn"
    >
      <svg class="google-icon" viewBox="0 0 24 24" width="18" height="18">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      <span>Sign in</span>
    </button>

    <!-- Signed in state -->
    <div v-else class="user-profile" @click="toggleDropdown">
      <div class="user-profile-inner">
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
            <div class="dropdown-info">
              <span class="dropdown-name">{{ authStore.userProfile?.displayName || 'User' }}</span>
              <span class="dropdown-email">{{ authStore.userProfile?.email }}</span>
            </div>
          </div>
          <div class="dropdown-divider"></div>
          <button class="dropdown-item" @click="handleResetProgress">
            <v-icon size="18">mdi-refresh</v-icon>
            <span>Reset Learning Progress</span>
          </button>
          <button class="dropdown-item signout-item" @click="handleSignOut">
            <v-icon size="18">mdi-logout</v-icon>
            <span>Sign out</span>
          </button>
        </div>
      </Transition>
    </div>

    <!-- Click outside to close dropdown -->
    <div v-if="showDropdown" class="dropdown-overlay" @click="showDropdown = false"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/src/store/auth';
import { useLearningStore } from '@/src/store/learning';

const authStore = useAuthStore();
const learningStore = useLearningStore();
const showDropdown = ref(false);
const showResetConfirm = ref(false);

const initials = computed(() => {
  const name = authStore.userProfile?.displayName || authStore.userProfile?.email || 'U';
  return name.charAt(0).toUpperCase();
});

const firstName = computed(() => {
  const name = authStore.userProfile?.displayName || '';
  return name.split(' ')[0] || 'User';
});

function toggleDropdown() {
  showDropdown.value = !showDropdown.value;
}

async function handleSignIn() {
  try {
    await authStore.signInWithGoogle();
  } catch (error) {
    console.error('Sign in failed:', error);
  }
}

async function handleSignOut() {
  showDropdown.value = false;
  try {
    await authStore.signOut();
  } catch (error) {
    console.error('Sign out failed:', error);
  }
}

function handleResetProgress() {
  // Confirm before resetting
  const confirmed = window.confirm(
    'Are you sure you want to reset all learning progress?\n\nThis will clear your Baseline progress, accuracy stats, and spaced repetition data. This action cannot be undone.'
  );

  if (confirmed) {
    learningStore.clearLearningData();
    showDropdown.value = false;
    // Reload page to reset all state
    window.location.reload();
  }
}

onMounted(() => {
  // Initialize auth state listener
  authStore.initAuth();
});
</script>

<style scoped>
.user-menu {
  position: relative;
  z-index: 200;
}

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

.sign-in-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sign-in-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
}

.google-icon {
  flex-shrink: 0;
}

.user-profile {
  cursor: pointer;
  position: relative;
}

.user-profile-inner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px 6px 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 980px;
  transition: all 0.2s ease;
}

.user-profile-inner:hover {
  background: rgba(255, 255, 255, 0.12);
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
  color: rgba(255, 255, 255, 0.9);
}

.dropdown-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 199;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 240px;
  background: #1a1a1a;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  z-index: 201;
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
  margin: 0;
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

.signout-item {
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  margin-top: 4px;
  padding-top: 12px;
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
</style>
