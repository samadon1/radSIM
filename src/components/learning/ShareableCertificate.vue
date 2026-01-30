<template>
  <div class="certificate-wrapper">
    <!-- Certificate Card (designed for social sharing) -->
    <div ref="certificateCard" class="certificate-card">
      <!-- Header -->
      <div class="cert-header">
        <div class="cert-logo">
          <div class="logo-icon">📊</div>
          <div class="logo-text">
            <div class="brand">RADSIM</div>
            <div class="subtitle">Radiology Learning</div>
          </div>
        </div>
        <div class="cert-badge">BASELINE COMPLETE</div>
      </div>

      <!-- User Info -->
      <div class="cert-user">
        <div class="user-avatar">
          <img v-if="userPhoto" :src="userPhoto" alt="User" />
          <div v-else class="avatar-placeholder">{{ userInitials }}</div>
        </div>
        <div class="user-info">
          <h2 class="user-name">{{ userName }}</h2>
          <div class="cert-date">Completed {{ formattedDate }}</div>
          <div class="cert-id">Certificate ID: {{ certificateId }}</div>
        </div>
      </div>

      <!-- Main Stats -->
      <div class="cert-stats">
        <div class="stat-primary">
          <div class="stat-circle">
            <svg viewBox="0 0 120 120" class="progress-ring">
              <circle cx="60" cy="60" r="54" class="ring-bg" />
              <circle
                cx="60" cy="60" r="54"
                class="ring-fill"
                :stroke-dasharray="`${accuracyCircumference} ${accuracyCircumference}`"
                :stroke-dashoffset="accuracyOffset"
              />
            </svg>
            <div class="stat-center">
              <div class="stat-value">{{ stats.accuracy }}%</div>
              <div class="stat-label">Accuracy</div>
            </div>
          </div>
        </div>

        <div class="stat-grid">
          <div class="stat-item">
            <div class="stat-num">{{ stats.casesReviewed }}</div>
            <div class="stat-name">Cases</div>
          </div>
          <div class="stat-item">
            <div class="stat-num">{{ stats.correct }}</div>
            <div class="stat-name">Correct</div>
          </div>
          <div class="stat-item">
            <div class="stat-num">{{ formatTime(stats.averageTime) }}</div>
            <div class="stat-name">Avg Time</div>
          </div>
        </div>
      </div>

      <!-- AI Insight -->
      <div class="cert-insight" v-if="aiInsight">
        <div class="insight-icon">💡</div>
        <div class="insight-text">{{ aiInsight }}</div>
      </div>

      <!-- Achievement Badges -->
      <div class="cert-achievements">
        <div class="achievement" v-if="stats.casesReviewed >= 20">
          <span class="ach-icon">✓</span>
          <span class="ach-text">Baseline Complete</span>
        </div>
        <div class="achievement" v-if="stats.accuracy >= 80">
          <span class="ach-icon">⭐</span>
          <span class="ach-text">High Performer</span>
        </div>
        <div class="achievement" v-if="bestFinding">
          <span class="ach-icon">🎯</span>
          <span class="ach-text">Strongest: {{ bestFinding }}</span>
        </div>
      </div>

      <!-- Footer -->
      <div class="cert-footer">
        <div class="cert-watermark">Certified by RADSIM</div>
        <div class="cert-link" v-if="shareUrl">{{ shareUrl }}</div>
      </div>
    </div>

    <!-- Action Buttons (not part of downloaded image) -->
    <div class="cert-actions">
      <button class="action-btn download" @click="downloadCertificate" :disabled="isGenerating">
        <span class="btn-icon">⬇</span>
        {{ isGenerating ? 'Generating...' : 'Download Image' }}
      </button>

      <div class="share-buttons">
        <button class="action-btn share twitter" @click="shareOnTwitter">
          <span class="btn-icon">𝕏</span>
          Share on X
        </button>
        <button class="action-btn share linkedin" @click="shareOnLinkedIn">
          <span class="btn-icon">in</span>
          LinkedIn
        </button>
        <button class="action-btn share facebook" @click="shareOnFacebook">
          <span class="btn-icon">f</span>
          Facebook
        </button>
      </div>

      <button class="action-btn close" @click="$emit('close')">
        Close
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import html2canvas from 'html2canvas';
import { useAuthStore } from '@/src/store/auth';
import { useGemini } from '@/src/composables/useGemini';
import type { SessionStats } from '@/src/store/learning';

const props = defineProps<{
  stats: SessionStats;
  bestFinding?: string;
}>();

defineEmits(['close']);

const authStore = useAuthStore();
const gemini = useGemini();
const certificateCard = ref<HTMLElement | null>(null);
const isGenerating = ref(false);
const aiInsight = ref<string>('');

// User info
const userName = computed(() => authStore.userProfile?.displayName || 'Radiology Learner');
const userPhoto = computed(() => authStore.userProfile?.photoURL);
const userInitials = computed(() => {
  const name = userName.value;
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
});

// Certificate details
const formattedDate = computed(() => new Date().toLocaleDateString('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric'
}));

const certificateId = computed(() => {
  // Generate a unique certificate ID
  const userId = authStore.userProfile?.uid.slice(0, 8) || 'guest';
  const timestamp = Date.now().toString(36);
  return `${userId}${timestamp}`.toUpperCase();
});

const shareUrl = computed(() => {
  // Optional: Generate shareable link if you implement certificate hosting
  return `radsim.app/cert/${certificateId.value}`;
});

// Stats calculations
const accuracy = computed(() => {
  const total = props.stats.correct + props.stats.missed;
  if (total === 0) return 0;
  return Math.round((props.stats.correct / total) * 100);
});

const stats = computed(() => ({
  casesReviewed: props.stats.casesReviewed,
  correct: props.stats.correctFindings,
  accuracy: accuracy.value,
  averageTime: props.stats.averageTime,
  averageScore: Math.round(props.stats.averageScore)
}));

// Progress ring calculations
const accuracyCircumference = 2 * Math.PI * 54; // radius = 54
const accuracyOffset = computed(() => {
  const progress = stats.value.accuracy / 100;
  return accuracyCircumference * (1 - progress);
});

function formatTime(seconds: number): string {
  if (!seconds || seconds === 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Generate AI insight using Gemini
async function generateAIInsight() {
  try {
    // Call Gemini composable to generate personalized insight
    aiInsight.value = await gemini.generatePerformanceInsight(props.stats);
  } catch (error) {
    console.error('Failed to generate AI insight:', error);
    aiInsight.value = "Keep practicing to improve your diagnostic skills!";
  }
}

// Download certificate as image
async function downloadCertificate() {
  if (!certificateCard.value) return;

  isGenerating.value = true;
  try {
    const canvas = await html2canvas(certificateCard.value, {
      backgroundColor: '#000000',
      scale: 2, // Higher quality
      logging: false,
    });

    const link = document.createElement('a');
    link.download = `radsim-certificate-${certificateId.value}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (error) {
    console.error('Failed to generate certificate:', error);
    alert('Failed to generate certificate. Please try again.');
  } finally {
    isGenerating.value = false;
  }
}

// Social sharing functions
function shareOnTwitter() {
  const text = `I just completed my RADSIM baseline assessment! 📊\n\n✓ ${stats.value.casesReviewed} cases reviewed\n✓ ${stats.value.accuracy}% accuracy\n\nImproving my radiology skills one case at a time! 🏥`;
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'width=550,height=420');
}

function shareOnLinkedIn() {
  const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl.value)}`;
  window.open(url, '_blank', 'width=550,height=420');
}

function shareOnFacebook() {
  const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl.value)}`;
  window.open(url, '_blank', 'width=550,height=420');
}

onMounted(() => {
  generateAIInsight();
});
</script>

<style scoped>
.certificate-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 40px 20px;
  background: #000;
  min-height: 100vh;
}

/* Certificate Card */
.certificate-card {
  width: 600px;
  background: linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 40px;
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
}

/* Header */
.cert-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.cert-logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  font-size: 32px;
}

.logo-text .brand {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.logo-text .subtitle {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.cert-badge {
  background: linear-gradient(135deg, #4263eb, #667eea);
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* User Info */
.cert-user {
  display: flex;
  gap: 20px;
  margin-bottom: 32px;
}

.user-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid rgba(255, 255, 255, 0.2);
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #4263eb, #667eea);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: 600;
}

.user-info {
  flex: 1;
}

.user-name {
  font-size: 28px;
  font-weight: 600;
  margin: 0 0 8px 0;
  letter-spacing: -0.5px;
}

.cert-date {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 4px;
}

.cert-id {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  font-family: 'Courier New', monospace;
}

/* Stats */
.cert-stats {
  display: flex;
  gap: 32px;
  margin-bottom: 24px;
  padding: 24px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 12px;
}

.stat-primary {
  flex-shrink: 0;
}

.stat-circle {
  position: relative;
  width: 120px;
  height: 120px;
}

.progress-ring {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ring-bg {
  fill: none;
  stroke: rgba(255, 255, 255, 0.1);
  stroke-width: 8;
}

.ring-fill {
  fill: none;
  stroke: url(#gradient);
  stroke-width: 8;
  stroke-linecap: round;
  transition: stroke-dashoffset 1s ease;
}

.stat-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  flex: 1;
  align-content: center;
}

.stat-item {
  text-align: center;
}

.stat-num {
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 4px;
}

.stat-name {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* AI Insight */
.cert-insight {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: rgba(66, 99, 235, 0.1);
  border-left: 3px solid #4263eb;
  border-radius: 8px;
  margin-bottom: 24px;
}

.insight-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.insight-text {
  font-size: 13px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.9);
}

/* Achievements */
.cert-achievements {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 24px;
}

.achievement {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 16px;
  font-size: 12px;
}

.ach-icon {
  font-size: 14px;
}

.ach-text {
  color: rgba(255, 255, 255, 0.9);
}

/* Footer */
.cert-footer {
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
}

.cert-watermark {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 4px;
}

.cert-link {
  font-size: 10px;
  color: rgba(66, 99, 235, 0.7);
  font-family: 'Courier New', monospace;
}

/* Action Buttons */
.cert-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 600px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 24px;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn.download {
  background: linear-gradient(135deg, #4263eb, #667eea);
  color: #fff;
}

.action-btn.download:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(66, 99, 235, 0.3);
}

.action-btn.download:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.share-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.action-btn.share {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
}

.action-btn.share:hover {
  background: rgba(255, 255, 255, 0.1);
}

.action-btn.share.twitter:hover {
  background: rgba(29, 155, 240, 0.2);
  border-color: #1d9bf0;
}

.action-btn.share.linkedin:hover {
  background: rgba(10, 102, 194, 0.2);
  border-color: #0a66c2;
}

.action-btn.share.facebook:hover {
  background: rgba(24, 119, 242, 0.2);
  border-color: #1877f2;
}

.action-btn.close {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.7);
}

.action-btn.close:hover {
  background: rgba(255, 255, 255, 0.05);
}

.btn-icon {
  font-size: 18px;
}

/* Responsive */
@media (max-width: 700px) {
  .certificate-card,
  .cert-actions {
    width: 100%;
    max-width: 500px;
  }

  .certificate-card {
    padding: 24px;
  }

  .cert-stats {
    flex-direction: column;
    align-items: center;
  }

  .stat-grid {
    width: 100%;
  }

  .user-name {
    font-size: 24px;
  }
}
</style>
