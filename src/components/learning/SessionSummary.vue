<template>
  <div class="session-summary">
    <!-- Close Button - Top Left of Page -->
    <div class="page-actions-left">
      <button class="icon-btn" @click="$emit('return-dashboard')" title="Close">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>

    <!-- Download Button - Top Right of Page -->
    <div class="page-actions-right">
      <button class="icon-btn" @click="downloadCard" :disabled="isDownloading" title="Download">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>

    <div class="summary-container">
      <!-- Session Complete Card - Horizontal Layout -->
      <div ref="certificateCard" class="completion-card">
        <!-- Background X-ray Image -->
        <div class="card-background">
          <img
            src="https://wp.technologyreview.com/wp-content/uploads/2021/04/for_press_release-2.jpg"
            alt="X-ray background"
            class="xray-bg"
          />
        </div>

        <!-- Left Side: Title & Primary Metric -->
        <div class="left-section">
          <div class="header-group">
            <div class="checkmark">
              <svg width="40" height="40" viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="32" r="31" stroke="rgba(255,255,255,0.08)" stroke-width="2"/>
                <path d="M20 32L28 40L44 24" stroke="#22c55e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="header-text">
              <h1 class="title">RADSIM BASELINE</h1>
              <p class="subtitle">{{ userName || authStore.userProfile?.email || 'Radiology Trainee' }} · {{ formattedDate }}</p>
            </div>
          </div>

          <div class="hero-metric">
            <div class="hero-gauge">
              <!-- SpaceX-style circular gauge -->
              <svg class="gauge-ring" viewBox="0 0 200 200">
                <circle
                  cx="100"
                  cy="100"
                  r="90"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.05)"
                  stroke-width="1"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="90"
                  fill="none"
                  :stroke="overallAccuracy >= 85 ? '#22c55e' : overallAccuracy >= 70 ? '#fbbf24' : '#ef4444'"
                  stroke-width="2"
                  stroke-dasharray="565.48"
                  :stroke-dashoffset="565.48 - (565.48 * overallAccuracy / 100)"
                  stroke-linecap="round"
                  transform="rotate(-90 100 100)"
                  class="gauge-progress"
                />
                <!-- Tick marks -->
                <g opacity="0.3">
                  <line v-for="i in 12" :key="i"
                    :x1="100"
                    :y1="15"
                    :x2="100"
                    :y2="20"
                    stroke="rgba(255,255,255,0.3)"
                    stroke-width="0.5"
                    :transform="`rotate(${i * 30} 100 100)`"
                  />
                </g>
              </svg>
              <div class="hero-number" :class="accuracyClass">
                {{ Math.round(overallAccuracy) }}%
              </div>
            </div>
            <div class="hero-label">DIAGNOSTIC ACCURACY</div>
          </div>
        </div>

        <!-- Divider -->
        <div class="vertical-divider"></div>

        <!-- Right Side: Stats & Details -->
        <div class="right-section">
          <!-- Secondary Metrics -->
          <div class="stats-row">
            <div class="stat-box hud-stat">
              <div class="hud-ring">
                <svg viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="35" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
                  <circle cx="40" cy="40" r="35" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"
                    stroke-dasharray="220" stroke-dashoffset="55" transform="rotate(-90 40 40)"/>
                </svg>
              </div>
              <div class="stat-value">{{ stats.casesReviewed }}</div>
              <div class="stat-label">CASES</div>
            </div>
            <div class="stat-box hud-stat">
              <div class="hud-ring">
                <svg viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="35" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
                  <circle cx="40" cy="40" r="35" fill="none" stroke="rgba(66,99,235,0.3)" stroke-width="1.5"
                    stroke-dasharray="220" stroke-dashoffset="110" transform="rotate(-90 40 40)"/>
                </svg>
              </div>
              <div class="stat-value">{{ displayScore }}%</div>
              <div class="stat-label">AVG SCORE</div>
            </div>
            <div class="stat-box hud-stat">
              <div class="hud-ring">
                <svg viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="35" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
                  <circle cx="40" cy="40" r="35" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1.5"
                    stroke-dasharray="220" stroke-dashoffset="165" transform="rotate(-90 40 40)"/>
                </svg>
              </div>
              <div class="stat-value">{{ formatTime(stats.averageTime) }}</div>
              <div class="stat-label">AVG TIME</div>
            </div>
          </div>

          <!-- Performance Breakdown - HUD Style Boxes -->
          <!-- <div class="performance-row">
            <div class="performance-box success-box">
              <div class="perf-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="perf-content">
                <div class="perf-number">{{ stats.correctFindings }}</div>
                <div class="perf-label">CORRECT</div>
              </div>
              <div class="perf-corner tl"></div>
              <div class="perf-corner tr"></div>
              <div class="perf-corner bl"></div>
              <div class="perf-corner br"></div>
            </div>
            <div class="performance-box review-box">
              <div class="perf-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </div>
              <div class="perf-content">
                <div class="perf-number">{{ stats.missedFindings }}</div>
                <div class="perf-label">REVIEW</div>
              </div>
              <div class="perf-corner tl"></div>
              <div class="perf-corner tr"></div>
              <div class="perf-corner bl"></div>
              <div class="perf-corner br"></div>
            </div>
          </div> -->

          <!-- AI Insight -->
          <div class="insight-box" v-if="aiInsight">
            <p class="insight-text">{{ aiInsight }}</p>
          </div>
        </div>

        <!-- Bottom Right Tagline -->
        <div class="card-tagline">
          FLIGHT SIMULATOR FOR RADIOLOGY
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="action-buttons">
        <button
          class="btn btn-secondary"
          @click="$emit('review-mistakes')"
          :disabled="stats.missedFindings === 0"
        >
          Review Mistakes
        </button>

        <button class="btn btn-primary" @click="$emit('return-dashboard')">
          Continue Training
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/src/store/auth';
import { useGemini } from '@/src/composables/useGemini';
import type { SessionStats } from '@/src/store/learning';
import html2canvas from 'html2canvas';

const props = defineProps<{
  stats: SessionStats;
  bestFinding?: string;
}>();

defineEmits(['return-dashboard', 'review-mistakes']);

const authStore = useAuthStore();
const gemini = useGemini();
const certificateCard = ref<HTMLElement | null>(null);
const isDownloading = ref(false);
const aiInsight = ref<string>('');

// User info
const userName = computed(() => authStore.userProfile?.displayName || 'Radiology Trainee');

// Certificate ID
const certificateId = computed(() => {
  const userId = authStore.userProfile?.uid.slice(0, 8) || 'GUEST';
  const timestamp = Date.now().toString(36).toUpperCase();
  return `${userId}${timestamp}`;
});

// Formatted date
const formattedDate = computed(() => {
  return new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  });
});

// Stats computations
const displayScore = computed(() => Math.round(props.stats.averageScore || 0));

const overallAccuracy = computed(() => {
  const total = props.stats.correctFindings + props.stats.missedFindings;
  if (total === 0) return 0;
  return (props.stats.correctFindings / total) * 100;
});

const accuracyClass = computed(() => {
  const acc = overallAccuracy.value;
  if (acc >= 85) return 'success';
  if (acc >= 70) return 'warning';
  return 'error';
});

const sessionMessage = computed(() => {
  const score = props.stats.averageScore || 0;
  if (score >= 90) return 'Excellent Performance';
  if (score >= 75) return 'Solid Progress';
  if (score >= 60) return 'Good Foundation';
  return 'Building Skills';
});

function formatTime(seconds: number): string {
  if (!seconds || seconds === 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Generate AI insight on mount
onMounted(async () => {
  try {
    console.log('[SessionSummary] Generating AI insight for stats:', props.stats);
    aiInsight.value = await gemini.generatePerformanceInsight(props.stats);
    console.log('[SessionSummary] AI insight generated:', aiInsight.value);
  } catch (error) {
    console.error('[SessionSummary] Failed to generate AI insight:', error);
    aiInsight.value = "Continue practicing to master diagnostic radiology skills.";
  }
});

// Download card as image
async function downloadCard() {
  if (!certificateCard.value) return;

  isDownloading.value = true;
  try {
    // First, try to load the image through a CORS proxy
    const imageUrl = 'https://wp.technologyreview.com/wp-content/uploads/2021/04/for_press_release-2.jpg';
    let imageDataUrl: string | null = null;

    try {
      // Try to fetch and convert to data URL
      const response = await fetch(imageUrl, { mode: 'cors' });
      const blob = await response.blob();
      imageDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.warn('Could not load external image, using gradient fallback:', err);
    }

    // Create a clone of the card to modify for capture
    const clone = certificateCard.value.cloneNode(true) as HTMLElement;
    clone.style.position = 'absolute';
    clone.style.left = '-9999px';
    clone.style.top = '0';
    document.body.appendChild(clone);

    // Find the background image and update it
    const bgImage = clone.querySelector('.xray-bg') as HTMLImageElement;
    if (bgImage) {
      if (imageDataUrl) {
        // Use the data URL version of the image
        bgImage.src = imageDataUrl;
        bgImage.style.opacity = '0.58';
        // Wait for image to load
        await new Promise((resolve) => {
          bgImage.onload = resolve;
          bgImage.onerror = resolve;
        });
      } else {
        // Fallback to gradient
        bgImage.style.opacity = '0.58';
        bgImage.style.background = `
          radial-gradient(ellipse 80% 60% at 40% 45%, rgba(80, 80, 80, 0.4) 0%, transparent 50%),
          radial-gradient(ellipse 60% 40% at 60% 55%, rgba(60, 60, 60, 0.3) 0%, transparent 50%),
          linear-gradient(135deg, rgba(40, 40, 40, 0.2) 0%, rgba(30, 30, 30, 0.15) 100%)
        `;
        bgImage.removeAttribute('src');
      }
    }

    const canvas = await html2canvas(clone, {
      backgroundColor: '#000000',
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true, // Allow tainted canvas since we're using data URL
    });

    // Clean up clone
    document.body.removeChild(clone);

    const link = document.createElement('a');
    link.download = `radsim-baseline-${certificateId.value}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (error) {
    console.error('Failed to download card:', error);
    alert('Failed to generate image. Please try again.');
  } finally {
    isDownloading.value = false;
  }
}

// Share on X/Twitter
function shareOnTwitter() {
  const text = `I just completed my RADSIM baseline assessment! 📊\n\n✓ ${props.stats.casesReviewed} cases reviewed\n✓ ${Math.round(overallAccuracy.value)}% accuracy\n\nImproving my radiology skills one case at a time! 🏥`;
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'width=550,height=420');
}
</script>

<style scoped>
/* Apple-like Minimalism: Ultra-Clean, Perfect Spacing */

.session-summary {
  min-height: 100vh;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 32px;
  position: relative;
}

.summary-container {
  max-width: 1280px;
  width: 100%;
}

/* Page Actions - Top Left & Right */
.page-actions-left {
  position: fixed;
  top: 32px;
  left: 32px;
  z-index: 100;
  animation: fadeInDown 0.6s ease-out 0.3s both;
}

.page-actions-right {
  position: fixed;
  top: 32px;
  right: 32px;
  z-index: 100;
  animation: fadeInDown 0.6s ease-out 0.3s both;
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Completion Card - Refined Horizontal Layout */
.completion-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 24px;
  padding: 64px;
  margin-bottom: 20px;
  display: flex;
  gap: 64px;
  align-items: stretch;
  position: relative;
  overflow: hidden;
  animation: cardFadeIn 0.8s ease-out, cardGlow 3s ease-in-out infinite;
}

@keyframes cardFadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes cardGlow {
  0%, 100% {
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.03);
  }
  50% {
    box-shadow: 0 0 40px rgba(255, 255, 255, 0.06);
  }
}

/* Background X-ray Image */
.card-background {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.xray-bg {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.50;
  filter: grayscale(100%) contrast(1.4) brightness(0.5);
}

.icon-btn {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 0;
}

.icon-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.9);
  transform: translateY(-1px);
}

.icon-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* Left Section - Hero Area */
.left-section {
  flex: 0 0 400px;
  display: flex;
  flex-direction: column;
  gap: 32px;
  position: relative;
  z-index: 1;
}

/* Bottom Right Tagline */
.card-tagline {
  position: absolute;
  bottom: 20px;
  right: 24px;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 2px;
  color: rgba(255, 255, 255, 0.25);
  font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
  z-index: 10;
}

/* Header Group */
.header-group {
  display: flex;
  align-items: center;
  gap: 16px;
}

.checkmark {
  flex-shrink: 0;
  opacity: 0.8;
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 0.8;
    transform: scale(1);
  }
}

.header-text {
  flex: 1;
  min-width: 0;
}

.title {
  font-size: 32px;
  font-weight: 600;
  letter-spacing: -0.8px;
  color: #fff;
  margin: 0 0 6px 0;
  line-height: 1.1;
}

.subtitle {
  font-size: 15px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.45);
  margin: 0;
  letter-spacing: -0.1px;
}

/* Hero Metric - SpaceX HUD Style */
.hero-metric {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  margin-top: 20px;
}

.hero-gauge {
  position: relative;
  width: 280px;
  height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gauge-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  transform: rotate(0deg);
}

.gauge-progress {
  transition: stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.hero-number {
  font-size: 72px;
  font-weight: 600;
  letter-spacing: -2px;
  color: #fff;
  line-height: 1;
  font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
  position: relative;
  z-index: 1;
}

.hero-number.success {
  color: #22c55e;
  text-shadow: 0 0 20px rgba(34, 197, 94, 0.3);
}

.hero-number.warning {
  color: #fbbf24;
  text-shadow: 0 0 20px rgba(251, 191, 36, 0.3);
}

.hero-number.error {
  color: #ef4444;
  text-shadow: 0 0 20px rgba(239, 68, 68, 0.3);
}

.hero-label {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 2px;
  text-transform: uppercase;
  font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
}

/* Vertical Divider */
.vertical-divider {
  width: 1px;
  background: rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
  margin: 0;
}

/* Right Section - Details */
.right-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 36px;
  min-width: 0;
  padding: 8px 0;
  position: relative;
  z-index: 1;
}

/* Stats Row - HUD Style */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 40px;
  padding-bottom: 40px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.stat-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.hud-stat {
  position: relative;
}

.hud-ring {
  position: absolute;
  width: 140px;
  height: 140px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -60%);
  opacity: 0.6;
  pointer-events: none;
}

.hud-ring svg {
  width: 100%;
  height: 100%;
}

.stat-value {
  font-size: 40px;
  font-weight: 600;
  letter-spacing: -1px;
  color: #fff;
  line-height: 1;
  font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
  position: relative;
  z-index: 1;
}

.stat-label {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 1.5px;
  text-transform: uppercase;
  font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
}

/* Performance Row - HUD Boxes */
.performance-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.performance-box {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
}

.success-box {
  border-color: rgba(34, 197, 94, 0.2);
  background: rgba(34, 197, 94, 0.03);
}

.review-box {
  border-color: rgba(251, 191, 36, 0.2);
  background: rgba(251, 191, 36, 0.03);
}

.perf-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.success-box .perf-icon {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.review-box .perf-icon {
  background: rgba(251, 191, 36, 0.1);
  color: #fbbf24;
}

.perf-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.perf-number {
  font-size: 28px;
  font-weight: 600;
  color: #fff;
  font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
  line-height: 1;
}

.perf-label {
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 1.5px;
  color: rgba(255, 255, 255, 0.4);
  font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
}

/* Corner Brackets */
.perf-corner {
  position: absolute;
  width: 8px;
  height: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.perf-corner.tl {
  top: -1px;
  left: -1px;
  border-right: none;
  border-bottom: none;
}

.perf-corner.tr {
  top: -1px;
  right: -1px;
  border-left: none;
  border-bottom: none;
}

.perf-corner.bl {
  bottom: -1px;
  left: -1px;
  border-right: none;
  border-top: none;
}

.perf-corner.br {
  bottom: -1px;
  right: -1px;
  border-left: none;
  border-top: none;
}

/* AI Insight */
.insight-box {
  padding: 28px;
  margin-top: 24px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 16px;
  min-height: 120px;
}

.insight-text {
  font-size: 15px;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.55);
  font-style: italic;
  letter-spacing: -0.2px;
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-wrap: break-word;
}


/* Action Buttons */
.action-buttons {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 16px;
}

.btn {
  padding: 22px 32px;
  border: none;
  border-radius: 16px;
  font-size: 17px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: -0.3px;
}

.btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.btn:active:not(:disabled) {
  transform: translateY(0);
}

.btn:disabled {
  opacity: 0.25;
  cursor: not-allowed;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.85);
}

.btn-primary {
  background: transparent;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 500;
  border: 1px solid rgba(255, 255, 255, 0.2);
  position: relative;
  overflow: hidden;
}

.btn-primary::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.08), transparent);
  transition: left 0.6s ease;
}

.btn-primary:hover:not(:disabled) {
  background: transparent;
  border-color: rgba(255, 255, 255, 0.35);
  color: #fff;
  transform: translateY(-1px);
}

.btn-primary:hover:not(:disabled)::before {
  left: 100%;
}

/* Responsive */
@media (max-width: 1200px) {
  .completion-card {
    padding: 56px;
  }

  .left-section {
    flex: 0 0 360px;
  }

  .hero-number {
    font-size: 100px;
  }
}

@media (max-width: 1024px) {
  .completion-card {
    flex-direction: column;
    gap: 48px;
    padding: 48px;
  }

  .left-section {
    flex: 1;
  }

  .vertical-divider {
    display: none;
  }

  .hero-metric {
    align-items: flex-start;
  }
}

@media (max-width: 768px) {
  .session-summary {
    padding: 40px 20px;
  }

  .completion-card {
    padding: 40px 32px;
    padding-top: 56px;
  }

  .card-actions {
    top: 16px;
    right: 16px;
  }

  .title {
    font-size: 28px;
  }

  .hero-number {
    font-size: 80px;
  }

  .stats-row {
    grid-template-columns: 1fr;
    gap: 28px;
  }

  .performance-row {
    flex-direction: column;
    gap: 20px;
  }

  .action-buttons {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .completion-card {
    padding: 32px 24px;
    padding-top: 56px;
  }

  .title {
    font-size: 24px;
  }

  .hero-number {
    font-size: 72px;
  }

  .action-buttons {
    grid-template-columns: 1fr;
  }
}
</style>
