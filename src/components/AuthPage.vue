<template>
  <div class="auth-page">
    <!-- Left Panel - Branding -->
    <div class="auth-branding">
      <div class="branding-content">
        <div class="branding-logo">
          <svg viewBox="0 0 32 32" fill="none">
            <rect x="4" y="4" width="10" height="10" rx="2" fill="currentColor"/>
            <rect x="18" y="4" width="10" height="10" rx="2" fill="currentColor" opacity="0.7"/>
            <rect x="4" y="18" width="10" height="10" rx="2" fill="currentColor" opacity="0.5"/>
            <rect x="18" y="18" width="10" height="10" rx="2" fill="currentColor" opacity="0.3"/>
          </svg>
          <span>RADSIM</span>
        </div>
        <h1 class="branding-title">The flight simulator<br>for radiology.</h1>
        <p class="branding-subtitle">Training the next generation with modern tools.</p>
      </div>
      <div class="branding-gradient"></div>
    </div>

    <!-- Right Panel - Auth Form -->
    <div class="auth-form-panel">
      <div class="auth-form-container">
        <!-- Back to home link -->
        <router-link to="/" class="back-link">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8L10 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Back to home
        </router-link>

        <!-- Auth Card -->
        <div class="auth-card">
          <h2 class="auth-title">{{ isSignUp ? 'Create account' : 'Welcome back' }}</h2>

          <!-- Error Message -->
          <div v-if="error" class="auth-error">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/>
              <path d="M8 4.5V8.5M8 11V11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            {{ error }}
          </div>

          <!-- Auth Options -->
          <div class="auth-options">
            <!-- Email Sign In (placeholder for future) -->
            <div class="auth-email-section">
              <div class="input-group">
                <label for="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  v-model="email"
                  placeholder="you@institution.edu"
                  :disabled="isLoading"
                />
              </div>
              <div class="input-group">
                <label for="password">Password</label>
                <div class="password-input-wrapper">
                  <input
                    :type="showPassword ? 'text' : 'password'"
                    id="password"
                    v-model="password"
                    placeholder="Enter your password"
                    :disabled="isLoading"
                  />
                  <button type="button" class="password-toggle" @click="showPassword = !showPassword">
                    <svg v-if="!showPassword" width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M10 4C4.5 4 1.5 10 1.5 10C1.5 10 4.5 16 10 16C15.5 16 18.5 10 18.5 10C18.5 10 15.5 4 10 4Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                      <circle cx="10" cy="10" r="3" stroke="currentColor" stroke-width="1.5"/>
                    </svg>
                    <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M3 3L17 17M8.5 8.5C7.8 9.2 7.8 10.8 8.5 11.5C9.2 12.2 10.8 12.2 11.5 11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                      <path d="M6.5 6.5C4 8 2.5 10 2.5 10C2.5 10 5 15 10 15C11.5 15 12.8 14.5 13.9 13.9M17.5 10C17.5 10 15.5 6 11 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                  </button>
                </div>
              </div>
              <button
                class="auth-btn primary"
                @click="handleEmailAuth"
                :disabled="!email || !password || isLoading"
              >
                {{ isLoading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Login') }}
              </button>
            </div>

            <!-- Secondary Links -->
            <div class="auth-secondary-links">
              <span v-if="!isSignUp">Don't have an account? <a href="#" @click.prevent="toggleAuthMode">Sign up</a></span>
              <span v-else>Already have an account? <a href="#" @click.prevent="toggleAuthMode">Login</a></span>
              <a v-if="!isSignUp" href="#" class="forgot-password">Forgot Password?</a>
            </div>

            <!-- Divider -->
            <div class="auth-divider">
              <span>or</span>
            </div>

            <!-- Google Sign In -->
            <button
              class="auth-btn google"
              @click="handleGoogleSignIn"
              :disabled="isLoading"
            >
              <svg class="auth-btn-icon" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>Continue with Google</span>
            </button>

            <!-- SSO Option -->
            <button class="auth-btn sso" @click="handleSSOLogin" :disabled="isLoading">
              <span>Sign in with Enterprise SSO</span>
            </button>
          </div>
        </div>

        <!-- Terms -->
        <p class="auth-terms">
          By signing up, you agree to our
          <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/src/store/auth';

const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const showPassword = ref(false);
const isLoading = ref(false);
const error = ref<string | null>(null);
const isSignUp = ref(false);

const toggleAuthMode = () => {
  isSignUp.value = !isSignUp.value;
  error.value = null;
};

const handleEmailAuth = async () => {
  if (!email.value || !password.value) return;

  isLoading.value = true;
  error.value = null;

  try {
    if (isSignUp.value) {
      await authStore.signUpWithEmail(email.value, password.value);
    } else {
      await authStore.signInWithEmail(email.value, password.value);
    }
    router.push('/dashboard');
  } catch (e: any) {
    // Error is already set by the auth store with user-friendly message
    error.value = authStore.error || 'Authentication failed';
  } finally {
    isLoading.value = false;
  }
};

const handleGoogleSignIn = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    await authStore.signInWithGoogle();
    // Popup completed successfully, navigate to dashboard
    router.push('/dashboard');
  } catch (e: any) {
    error.value = e.message || 'Failed to sign in with Google';
  } finally {
    isLoading.value = false;
  }
};

const handleSSOLogin = () => {
  // Placeholder for SSO - would redirect to institution's IdP
  error.value = 'Institutional SSO coming soon. Please use Google or email sign-in for now.';
};
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1fr 1fr;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* Left Panel - Branding */
.auth-branding {
  position: relative;
  background: #000000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
  overflow: hidden;
}

.branding-content {
  position: relative;
  z-index: 2;
  max-width: 480px;
}

.branding-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 48px;
  color: #FFFFFF;
}

.branding-logo svg {
  width: 40px;
  height: 40px;
}

.branding-logo span {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.branding-title {
  font-size: 48px;
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: #FFFFFF;
  margin-bottom: 24px;
}

.branding-subtitle {
  font-size: 18px;
  font-weight: 400;
  line-height: 1.5;
  color: #86868B;
  letter-spacing: -0.01em;
}

.branding-gradient {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    linear-gradient(135deg, rgba(0, 122, 255, 0.15) 0%, transparent 50%),
    linear-gradient(225deg, rgba(88, 86, 214, 0.15) 0%, transparent 50%),
    linear-gradient(180deg, #000000 0%, #0A0A0A 100%);
  z-index: 1;
}

/* Right Panel - Auth Form */
.auth-form-panel {
  background: #000000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
}

.auth-form-container {
  width: 100%;
  max-width: 400px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #86868B;
  text-decoration: none;
  font-size: 14px;
  font-weight: 400;
  letter-spacing: -0.01em;
  transition: color 0.2s ease;
  margin-bottom: 32px;
}

.back-link:hover {
  color: #FFFFFF;
}

.auth-card {
  margin-bottom: 24px;
}

.auth-title {
  font-size: 28px;
  font-weight: 600;
  color: #FFFFFF;
  margin-bottom: 32px;
  letter-spacing: -0.02em;
}

.auth-error {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: rgba(255, 59, 48, 0.1);
  border: 1px solid rgba(255, 59, 48, 0.3);
  border-radius: 10px;
  color: #FF453A;
  font-size: 14px;
  margin-bottom: 24px;
}

.auth-options {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.auth-email-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-group label {
  font-size: 14px;
  font-weight: 500;
  color: #FFFFFF;
  letter-spacing: -0.01em;
}

.input-group input {
  width: 100%;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  color: #FFFFFF;
  font-size: 15px;
  letter-spacing: -0.01em;
  transition: all 0.2s ease;
}

.input-group input::placeholder {
  color: #6E6E73;
}

.input-group input:focus {
  outline: none;
  border-color: #0A84FF;
  background: rgba(10, 132, 255, 0.05);
}

.input-group input:disabled {
  opacity: 0.5;
}

.password-input-wrapper {
  position: relative;
}

.password-input-wrapper input {
  padding-right: 48px;
}

.password-toggle {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #6E6E73;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
}

.password-toggle:hover {
  color: #FFFFFF;
}

.auth-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  padding: 14px 20px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  letter-spacing: -0.01em;
}

.auth-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.auth-btn-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.auth-btn.primary {
  background: #0A84FF;
  color: #FFFFFF;
}

.auth-btn.primary:hover:not(:disabled) {
  background: #0077ED;
}

.auth-btn.google {
  background: transparent;
  color: #FFFFFF;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.auth-btn.google:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.3);
}

.auth-btn.sso {
  background: transparent;
  color: #FFFFFF;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.auth-btn.sso:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.3);
}

.auth-secondary-links {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #86868B;
}

.auth-secondary-links a {
  color: #0A84FF;
  text-decoration: none;
}

.auth-secondary-links a:hover {
  text-decoration: underline;
}

.forgot-password {
  color: #86868B !important;
}

.forgot-password:hover {
  color: #FFFFFF !important;
}

.auth-divider {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 8px 0;
}

.auth-divider::before,
.auth-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
}

.auth-divider span {
  font-size: 13px;
  color: #6E6E73;
  letter-spacing: -0.01em;
  text-transform: uppercase;
}

.auth-terms {
  text-align: center;
  font-size: 13px;
  color: #6E6E73;
  letter-spacing: -0.01em;
  line-height: 1.5;
}

.auth-terms a {
  color: #0A84FF;
  text-decoration: underline;
}

.auth-terms a:hover {
  text-decoration: none;
}

/* Responsive */
@media (max-width: 1024px) {
  .auth-page {
    grid-template-columns: 1fr;
  }

  .auth-branding {
    display: none;
  }

  .auth-form-panel {
    padding: 40px 24px;
  }
}

@media (max-width: 480px) {
  .auth-title {
    font-size: 24px;
  }

  .auth-btn {
    padding: 12px 16px;
  }
}
</style>
