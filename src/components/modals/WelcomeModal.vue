<template>
  <teleport to="body">
    <div class="modal-overlay" @click.self="handleClose">
      <div class="modal-card">
        <!-- Header -->
        <h1>Welcome to RADSIM</h1>
        <p class="description">Let's calibrate your personalized learning path with a quick baseline assessment.</p>

        <!-- Steps -->
        <div class="steps">
          <div class="step">
            <div class="step-number active">1</div>
            <div class="step-content">
              <span class="step-title">Baseline Assessment</span>
              <span class="step-desc">{{ APP_STATS.baselineCases }} cases to understand your strengths</span>
            </div>
          </div>
          <div class="step">
            <div class="step-number">2</div>
            <div class="step-content">
              <span class="step-title">Adaptive Learning</span>
              <span class="step-desc">AI-powered spaced repetition</span>
            </div>
          </div>
          <div class="step">
            <div class="step-number">3</div>
            <div class="step-content">
              <span class="step-title">Master Diagnostics</span>
              <span class="step-desc">Track your progress over time</span>
            </div>
          </div>
        </div>

        <!-- Time estimate -->
        <div class="time-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/>
            <path d="M12 7v5l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <span>About {{ APP_STATS.baselineMinutes }} minutes</span>
        </div>

        <!-- Actions -->
        <button class="btn-primary" @click="handleGetStarted">Get Started</button>
        <button class="btn-secondary" @click="handleClose">I'll do this later</button>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/src/firebase/config';
import { useAuthStore } from '@/src/store/auth';
import { APP_STATS } from '@/src/config/pricing';

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'start-baseline'): void;
}>();

const authStore = useAuthStore();

async function handleClose() {
  await markWelcomeSeen();
  emit('close');
}

async function handleGetStarted() {
  await markWelcomeSeen();
  emit('start-baseline');
}

async function markWelcomeSeen() {
  if (authStore.isAuthenticated && authStore.userProfile) {
    try {
      const userRef = doc(db, 'users', authStore.userProfile.uid);
      await updateDoc(userRef, { hasSeenWelcome: true });
    } catch (error) {
      console.error('Failed to mark welcome as seen:', error);
    }
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 24px;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 32px;
  max-width: 400px;
  width: 100%;
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

h1 {
  font-size: 24px;
  font-weight: 600;
  color: #FFFFFF;
  margin: 0 0 8px;
  letter-spacing: -0.02em;
  text-align: center;
}

.description {
  font-size: 14px;
  color: #86868B;
  letter-spacing: -0.01em;
  text-align: center;
  margin: 0 0 28px;
  line-height: 1.5;
}

.steps {
  margin-bottom: 24px;
}

.step {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 16px;
}

.step:last-child {
  margin-bottom: 0;
}

.step-number {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: #86868B;
  flex-shrink: 0;
}

.step-number.active {
  background: rgba(10, 132, 255, 0.15);
  border-color: rgba(10, 132, 255, 0.3);
  color: #0A84FF;
}

.step-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 3px;
}

.step-title {
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.85);
  letter-spacing: -0.01em;
}

.step-desc {
  font-size: 13px;
  color: #86868B;
  letter-spacing: -0.01em;
}

.time-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 20px;
  color: #86868B;
  font-size: 13px;
  letter-spacing: -0.01em;
  margin-bottom: 24px;
}

.btn-primary {
  width: 100%;
  padding: 14px 24px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: -0.01em;
  border: none;
  background: #0A84FF;
  color: #FFFFFF;
  margin-bottom: 8px;
}

.btn-primary:hover {
  background: #0077ED;
}

.btn-secondary {
  width: 100%;
  padding: 14px 24px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: -0.01em;
  background: transparent;
  color: #FFFFFF;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.3);
}
</style>
