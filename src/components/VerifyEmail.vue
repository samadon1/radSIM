<template>
  <div class="verify-email-page">
    <div class="verify-container">
      <div class="verify-logo">
        <svg viewBox="0 0 32 32" fill="none">
          <rect x="4" y="4" width="10" height="10" rx="2" fill="currentColor"/>
          <rect x="18" y="4" width="10" height="10" rx="2" fill="currentColor" opacity="0.7"/>
          <rect x="4" y="18" width="10" height="10" rx="2" fill="currentColor" opacity="0.5"/>
          <rect x="18" y="18" width="10" height="10" rx="2" fill="currentColor" opacity="0.3"/>
        </svg>
        <span>RADSIM</span>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="verify-content">
        <div class="verify-spinner"></div>
        <h1 class="verify-title">Verifying your email...</h1>
        <p class="verify-subtitle">Please wait while we confirm your email address.</p>
      </div>

      <!-- Success State -->
      <div v-else-if="isVerified" class="verify-content">
        <div class="verify-icon success">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="20" stroke="currentColor" stroke-width="2"/>
            <path d="M16 24L22 30L32 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <h1 class="verify-title">Email verified!</h1>
        <p class="verify-subtitle">Your email has been successfully verified. You can now access all features.</p>
        <button class="verify-btn" @click="goToDashboard">
          Continue to Dashboard
        </button>
      </div>

      <!-- Error State -->
      <div v-else class="verify-content">
        <div class="verify-icon error">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="20" stroke="currentColor" stroke-width="2"/>
            <path d="M24 16V28M24 32V34" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
        </div>
        <h1 class="verify-title">Verification failed</h1>
        <p class="verify-subtitle">{{ error || 'The verification link may have expired or already been used.' }}</p>
        <div class="verify-actions">
          <button class="verify-btn" @click="goToLogin">
            Back to Login
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { applyActionCode } from 'firebase/auth';
import { auth } from '@/src/firebase/config';
import { useAuthStore } from '@/src/store/auth';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const isLoading = ref(true);
const isVerified = ref(false);
const error = ref<string | null>(null);

const goToDashboard = () => {
  router.push('/dashboard');
};

const goToLogin = () => {
  router.push('/login');
};

onMounted(async () => {
  // Get the action code from URL
  const oobCode = route.query.oobCode as string;
  const mode = route.query.mode as string;

  if (!oobCode || mode !== 'verifyEmail') {
    isLoading.value = false;
    error.value = 'Invalid verification link.';
    return;
  }

  try {
    // Apply the verification code
    await applyActionCode(auth, oobCode);

    // Reload the user to get updated emailVerified status
    if (auth.currentUser) {
      await auth.currentUser.reload();
    }

    isVerified.value = true;
  } catch (e: any) {
    console.error('Email verification error:', e);

    // Provide user-friendly error messages
    if (e.code === 'auth/expired-action-code') {
      error.value = 'This verification link has expired. Please request a new one.';
    } else if (e.code === 'auth/invalid-action-code') {
      error.value = 'This verification link is invalid or has already been used.';
    } else {
      error.value = e.message || 'Failed to verify email.';
    }
  } finally {
    isLoading.value = false;
  }
});
</script>

<style scoped>
.verify-email-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000000;
  padding: 40px 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
}

.verify-container {
  width: 100%;
  max-width: 400px;
  text-align: center;
}

.verify-logo {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 48px;
  color: #FFFFFF;
}

.verify-logo svg {
  width: 40px;
  height: 40px;
}

.verify-logo span {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.verify-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.verify-spinner {
  width: 48px;
  height: 48px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #0A84FF;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 24px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.verify-icon {
  margin-bottom: 24px;
}

.verify-icon.success {
  color: #30D158;
}

.verify-icon.error {
  color: #FF453A;
}

.verify-title {
  font-size: 28px;
  font-weight: 600;
  color: #FFFFFF;
  margin-bottom: 16px;
  letter-spacing: -0.02em;
}

.verify-subtitle {
  font-size: 16px;
  color: #86868B;
  line-height: 1.5;
  margin-bottom: 32px;
  max-width: 320px;
}

.verify-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.verify-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 14px 20px;
  background: #0A84FF;
  color: #FFFFFF;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;
  letter-spacing: -0.01em;
}

.verify-btn:hover {
  background: #0077ED;
}
</style>
