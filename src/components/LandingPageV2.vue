<template>
  <div class="landing-page-v2">
    <!-- Shared App Header -->
    <AppHeader />

    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-container">
        <div class="hero-content">
          <h1 class="hero-title">The flight simulator<br>for radiology.</h1>
          <p class="hero-subtitle">
            Training the next generation with modern tools
          </p>

          <div class="hero-actions">
            <button class="btn-hero primary" @click="handleGetStarted">
              {{ authStore.isAuthenticated ? 'Go to Dashboard' : 'Get Started' }}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 12L10 8L6 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <button class="btn-hero secondary" @click="openVideoModal">
              Watch overview
            </button>
          </div>
        </div>

        <div class="hero-visual">
          <!-- Premium Video Card -->
          <div class="video-card-premium">
            <div class="video-thumbnail">
              <div class="play-button">
                <div class="play-button-inner">
                  <svg width="20" height="24" viewBox="0 0 20 24" fill="none">
                    <path d="M0 0L20 12L0 24V0Z" fill="currentColor"/>
                  </svg>
                </div>
              </div>
              <div class="video-overlay">
                <span class="video-duration">2:30</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="features-section">
      <div class="features-container">
        <div class="section-header">
          <h2>Train like you diagnose.</h2>
          <p>Real cases. Real complexity. Real feedback.</p>
        </div>

        <div class="features-showcase">
          <!-- Central rotating medical images -->
          <div class="central-image">
            <div class="xray-container">
              <img
                v-for="(image, index) in showcaseImages"
                :key="image.src"
                :src="image.src"
                :alt="image.alt"
                class="xray-image"
                :class="getImageClass(index)"
              />
              <div class="xray-overlay"></div>
            </div>
          </div>

          <!-- Overlapping feature cards -->
          <div class="feature-card floating-card card-top-left">
            <h3>3D Visualization</h3>
            <p>Full volumetric rendering with MPR views, windowing, and measurement tools.</p>
          </div>

          <div class="feature-card floating-card card-top-right">
            <h3>AI-Guided Learning</h3>
            <p>Personalized feedback and adaptive case selection based on your progress.</p>
          </div>

          <div class="feature-card floating-card card-bottom-left">
            <h3>Annotation Tools</h3>
            <p>Mark findings, add measurements, and practice structured reporting.</p>
          </div>

          <div class="feature-card floating-card card-bottom-right">
            <h3>Progress Tracking</h3>
            <p>Detailed analytics on accuracy, speed, and areas for improvement.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Powered By Section -->
    <section class="powered-by-section">
      <div class="powered-by-container">
        <div class="powered-by-header">
          <h2>Built on the best models from industry and academia</h2>
        </div>

        <div class="model-grid">
          <div class="model-item">
            <div class="model-logo">
              <img src="/google-color.svg" alt="Google" />
            </div>
            <div class="model-info">
              <h3>Google HAI-DEF</h3>
              <span class="model-org">Health AI Developer Foundations</span>
            </div>
          </div>

          <div class="model-item">
            <div class="model-logo">
              <img src="/nvidia-color.svg" alt="NVIDIA" />
            </div>
            <div class="model-info">
              <h3>NVIDIA Clara</h3>
              <span class="model-org">Healthcare AI Platform</span>
            </div>
          </div>

          <div class="model-item">
            <div class="model-logo">
              <img src="/stanford.avif" alt="Stanford" />
            </div>
            <div class="model-info">
              <h3>Stanford MIMI</h3>
              <span class="model-org">Machine Intelligence in Medical Imaging</span>
            </div>
          </div>

          <div class="model-item">
            <div class="model-logo">
              <img src="/microsoft-color.svg" alt="Microsoft" />
            </div>
            <div class="model-info">
              <h3>Microsoft Health Futures</h3>
              <span class="model-org">Healthcare AI Research</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Testimonial Section -->
    <section id="testimonials" class="testimonial-section">
      <div class="testimonial-container">
        <div class="testimonial-content">
          <svg class="quote-icon" width="48" height="48" viewBox="0 0 48 48" fill="none">
            <path d="M14 24H8c0-6.627 5.373-12 12-12v6c-3.314 0-6 2.686-6 6zm20 0h-6c0-6.627 5.373-12 12-12v6c-3.314 0-6 2.686-6 6z" fill="rgba(255,255,255,0.1)"/>
          </svg>
          <blockquote>
            "RADSIM transformed how I prepare for my boards. The real-world cases and instant feedback helped me identify gaps in my knowledge I didn't know existed."
          </blockquote>
          <div class="testimonial-author">
            <div class="author-avatar">DR</div>
            <div class="author-info">
              <div class="author-name">Dr. Rebecca Chen</div>
              <div class="author-title">Radiology Resident, Stanford Medicine</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Pricing Section -->
    <section id="pricing" class="pricing-section">
      <div class="pricing-container">
        <div class="pricing-header">
          <h2>Choose your training path</h2>
          <p>From student to attending, we've got you covered</p>
        </div>

        <div class="pricing-grid">
          <div
            v-for="tier in PRICING_TIERS"
            :key="tier.id"
            class="pricing-card"
            :class="{ featured: tier.highlighted }"
          >
            <div v-if="tier.badge" class="featured-badge">{{ tier.badge }}</div>
            <div class="pricing-card-header">
              <h3 class="plan-name">{{ tier.name }}</h3>
              <p class="plan-description">{{ tier.description }}</p>
            </div>
            <div class="pricing-card-price">
              <span class="price-amount">{{ formatPrice(tier.price.monthly) }}</span>
              <span v-if="tier.price.monthly !== 'custom'" class="price-period">/month</span>
            </div>
            <div v-if="tier.price.monthly === 'custom'" class="price-annual">Volume-based pricing</div>
            <ul class="pricing-features">
              <li v-for="(feature, index) in tier.features" :key="index">
                <svg class="feature-check" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
                <strong v-if="feature.highlight">{{ feature.highlight }}</strong>
                {{ feature.text }}
              </li>
            </ul>
            <button
              class="pricing-btn"
              :class="tier.highlighted ? 'primary' : 'secondary'"
              @click="tier.cta.action === 'contact' ? handleContactSales() : handleGetStarted()"
            >
              {{ tier.cta.text }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="cta-section">
      <div class="cta-container">
        <div class="cta-content">
          <h2>Ready to elevate your diagnostic skills?</h2>
          <p>Join thousands of radiology professionals training smarter.</p>
          <div class="cta-actions">
            <button class="btn-cta primary" @click="handleGetStarted">
              {{ authStore.isAuthenticated ? 'Go to Dashboard' : 'Get Started' }}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 12L10 8L6 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <button class="btn-cta secondary">
              Contact Sales
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <div class="footer-container">
        <div class="footer-content">
          <div class="footer-brand-section">
            <div class="footer-brand">
              <svg class="footer-logo" viewBox="0 0 32 32" fill="none">
                <rect x="4" y="4" width="10" height="10" rx="2" fill="currentColor"/>
                <rect x="18" y="4" width="10" height="10" rx="2" fill="currentColor" opacity="0.7"/>
                <rect x="4" y="18" width="10" height="10" rx="2" fill="currentColor" opacity="0.5"/>
                <rect x="18" y="18" width="10" height="10" rx="2" fill="currentColor" opacity="0.3"/>
              </svg>
              <span class="footer-brand-name">RADSIM</span>
            </div>
            <p class="footer-tagline">The flight simulator for radiology.</p>
          </div>
        </div>

        <div class="footer-bottom">
          <div class="footer-legal">
            <span>&copy; 2026 RADSIM. All rights reserved.</span>
            <div class="footer-legal-links">
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
            </div>
          </div>
        </div>
      </div>
    </footer>

    <!-- Video Modal -->
    <div v-if="showVideoModal" class="video-modal" @click="closeVideoModal">
      <div class="modal-overlay"></div>
      <div class="modal-content" @click.stop>
        <button class="modal-close" @click="closeVideoModal">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
        <div class="video-wrapper">
          <div class="video-placeholder">
            <div class="play-icon-large">
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                <circle cx="40" cy="40" r="40" fill="rgba(255, 255, 255, 0.1)"/>
                <path d="M32 24L56 40L32 56V24Z" fill="white"/>
              </svg>
            </div>
            <p>Video placeholder - Demo video would play here</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import AppHeader from './AppHeader.vue';
import { useAuthStore } from '@/src/store/auth';
import { PRICING_TIERS, formatPrice } from '@/src/config/pricing';

const router = useRouter();
const authStore = useAuthStore();
const showVideoModal = ref(false);

// Showcase images for rotation
const showcaseImages = [
  { src: '/cases/images/00000116_009.png', alt: 'Chest X-ray' },
  { src: '/ct_brain.jpg', alt: 'CT Brain Scan' },
  { src: '/mri_brain.jpeg', alt: 'MRI Brain Scan' },
  { src: '/mri_leg.jpg', alt: 'MRI Leg Scan' },
];

const currentImageIndex = ref(0);
let imageRotationInterval: number | null = null;

const startImageRotation = () => {
  imageRotationInterval = window.setInterval(() => {
    currentImageIndex.value = (currentImageIndex.value + 1) % showcaseImages.length;
  }, 4000); // Change image every 4 seconds
};

// Get class for deck stack effect based on position relative to current
const getImageClass = (index: number) => {
  const total = showcaseImages.length;
  const current = currentImageIndex.value;

  if (index === current) return 'active';

  // Calculate relative position in circular array
  const diff = (index - current + total) % total;

  if (diff === 1) return 'next';
  if (diff === 2) return 'next-2';
  if (diff === total - 1) return 'prev';
  return 'behind';
};

onMounted(() => {
  startImageRotation();
});

onUnmounted(() => {
  if (imageRotationInterval) {
    clearInterval(imageRotationInterval);
  }
});

const handleGetStarted = () => {
  if (authStore.isAuthenticated) {
    router.push('/dashboard');
  } else {
    router.push('/login');
  }
};

const handleContactSales = () => {
  window.location.href = 'mailto:sales@radsim.ai?subject=RADSIM Pro Inquiry';
};

const openVideoModal = () => {
  showVideoModal.value = true;
};

const closeVideoModal = () => {
  showVideoModal.value = false;
};
</script>

<style>
/* Global overrides for landing page */
html {
  overflow-x: hidden !important;
  overflow-y: visible !important;
}

body {
  position: static !important;
  width: 100% !important;
  height: auto !important;
  overflow-x: hidden !important;
  overflow-y: visible !important;
}
</style>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.landing-page-v2 {
  background: #000000;
  color: #FFFFFF;
  width: 100%;
  min-height: 100vh;
  padding-top: 72px;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Hero Section */
.hero {
  min-height: calc(100vh - 72px);
  display: flex;
  align-items: center;
  padding: 60px 120px 100px 120px;
  background: linear-gradient(180deg, #000000 0%, #0A0A0A 100%);
}

.hero-container {
  width: 100%;
  max-width: 1920px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 120px;
  align-items: center;
}

.hero-content {
  max-width: 600px;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 980px;
  margin-bottom: 28px;
  font-size: 13px;
  font-weight: 400;
  color: #F5F5F7;
  letter-spacing: -0.01em;
}

.badge-dot {
  width: 6px;
  height: 6px;
  background: #34C759;
  border-radius: 50%;
}

.hero-title {
  font-size: 80px;
  font-weight: 600;
  line-height: 1.05;
  letter-spacing: -0.015em;
  color: #FFFFFF;
  margin-bottom: 24px;
}

.hero-subtitle {
  font-size: 24px;
  font-weight: 400;
  line-height: 1.4;
  color: #98989D;
  margin-bottom: 40px;
  letter-spacing: -0.01em;
}

.hero-actions {
  display: flex;
  gap: 16px;
  margin-bottom: 64px;
}

.btn-hero {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 24px;
  border-radius: 980px;
  font-size: 16px;
  font-weight: 400;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  letter-spacing: -0.01em;
}

.btn-hero.primary {
  background: #FFFFFF;
  color: #000000;
}

.btn-hero.primary:hover {
  background: #E5E5E5;
  transform: scale(1.02);
}

.btn-hero.secondary {
  background: transparent;
  color: #FFFFFF;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.btn-hero.secondary:hover {
  background: rgba(255, 255, 255, 0.1);
}

.hero-stats {
  display: flex;
  align-items: center;
  gap: 32px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #FFFFFF;
  letter-spacing: -0.02em;
}

.stat-label {
  font-size: 13px;
  font-weight: 400;
  color: #98989D;
  letter-spacing: -0.01em;
}

.stat-divider {
  width: 1px;
  height: 32px;
  background: rgba(255, 255, 255, 0.2);
}

/* Premium Video Card */
.video-card-premium {
  width: 100%;
  position: relative;
}

.video-thumbnail {
  width: 100%;
  aspect-ratio: 16/10;
  background: linear-gradient(135deg, #667EEA 0%, #764BA2 100%);
  border-radius: 24px;
  position: relative;
  overflow: hidden;
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.04),
    0 8px 24px rgba(0, 0, 0, 0.06),
    0 16px 48px rgba(0, 0, 0, 0.08);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.video-card-premium:hover .video-thumbnail {
  transform: translateY(-4px);
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.06),
    0 12px 32px rgba(0, 0, 0, 0.08),
    0 24px 64px rgba(0, 0, 0, 0.1);
}

.play-button {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.play-button-inner {
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #000000;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.play-button-inner:hover {
  transform: scale(1.05);
  background: #FFFFFF;
}

.play-button-inner svg {
  margin-left: 3px;
}

.video-overlay {
  position: absolute;
  bottom: 20px;
  right: 20px;
}

.video-duration {
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(20px);
  border-radius: 6px;
  color: #FFFFFF;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

/* Features Section */
.features-section {
  padding: 140px 48px;
  background: #000000;
  overflow: hidden;
}

.features-container {
  max-width: 1400px;
  margin: 0 auto;
}

.section-header {
  text-align: center;
  margin-bottom: 8px;
}

.section-header h2 {
  font-size: 56px;
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: #FFFFFF;
  margin-bottom: 16px;
}

.section-header p {
  font-size: 21px;
  font-weight: 400;
  color: #86868B;
  letter-spacing: -0.01em;
}

/* Features Showcase - Overlapping Cards Layout */
.features-showcase {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 800px;
  padding: 60px 0;
}

/* Central X-ray Image */
.central-image {
  position: relative;
  z-index: 1;
  width: 580px;
  height: 700px;
  flex-shrink: 0;
}

.xray-container {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 24px;
  overflow: visible;
  background: transparent;
}

.xray-image {
  position: absolute;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 24px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
  transition: opacity 0.6s ease-in-out, filter 0.6s ease-in-out;
}

/* Active states - control visibility, stacking, and position */
.xray-image.active {
  opacity: 1;
  z-index: 4;
  filter: brightness(1);
  top: 8px;
  left: 8px;
}

.xray-image.prev {
  opacity: 0;
  z-index: 5;
  filter: brightness(1);
  top: 8px;
  left: 8px;
}

.xray-image.next {
  opacity: 1;
  z-index: 3;
  filter: brightness(0.8);
  top: -8px;
  left: -8px;
}

.xray-image.next-2 {
  opacity: 1;
  z-index: 2;
  filter: brightness(0.65);
  top: -16px;
  left: -16px;
}

.xray-image.behind {
  opacity: 1;
  z-index: 1;
  filter: brightness(0.5);
  top: -24px;
  left: -24px;
}

.xray-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.2) 100%);
  pointer-events: none;
}

/* Powered By Section */
.powered-by-section {
  padding: 100px 48px;
  background: #000000;
}

.powered-by-container {
  max-width: 1200px;
  margin: 0 auto;
}

.powered-by-header {
  text-align: center;
  margin-bottom: 56px;
}

.powered-by-header h2 {
  font-size: 40px;
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: #FFFFFF;
}

.model-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 48px;
}

.model-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.model-logo {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.model-logo img {
  width: 48px;
  height: 48px;
  object-fit: contain;
}

.model-info h3 {
  font-size: 17px;
  font-weight: 600;
  color: #FFFFFF;
  letter-spacing: -0.02em;
  margin-bottom: 4px;
}

.model-org {
  font-size: 13px;
  font-weight: 400;
  color: #6E6E73;
  letter-spacing: -0.01em;
}

/* Overlapping Feature Cards */
.feature-card {
  padding: 24px 28px;
  background: rgba(20, 20, 22, 0.6);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  transition: all 0.3s ease;
}

.floating-card {
  position: absolute;
  width: 320px;
  z-index: 2;
}

.card-top-left {
  top: 40px;
  left: 0;
  transform: translateX(55%);
}

.card-top-right {
  top: 80px;
  right: 0;
  transform: translateX(-55%);
}

.card-bottom-left {
  bottom: 80px;
  left: 0;
  transform: translateX(55%);
}

.card-bottom-right {
  bottom: 40px;
  right: 0;
  transform: translateX(-55%);
}

.feature-card:hover {
  background: rgba(30, 30, 32, 0.7);
  border-color: rgba(255, 255, 255, 0.12);
  transform: translateX(55%) translateY(-2px);
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.4);
}

.card-top-right:hover,
.card-bottom-right:hover {
  transform: translateX(-55%) translateY(-2px);
}

.feature-card h3 {
  font-size: 18px;
  font-weight: 600;
  color: #FFFFFF;
  margin-bottom: 8px;
  letter-spacing: -0.02em;
}

.feature-card p {
  font-size: 14px;
  font-weight: 400;
  color: #98989D;
  line-height: 1.5;
  letter-spacing: -0.01em;
}

/* Testimonial Section */
.testimonial-section {
  padding: 140px 48px;
  background: #000000;
}

.testimonial-container {
  max-width: 800px;
  margin: 0 auto;
}

.testimonial-content {
  text-align: center;
  position: relative;
}

.quote-icon {
  margin-bottom: 32px;
  opacity: 0.3;
}

blockquote {
  font-size: 28px;
  font-weight: 400;
  color: #F5F5F7;
  line-height: 1.4;
  letter-spacing: -0.02em;
  margin-bottom: 40px;
  font-style: normal;
}

.testimonial-author {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.author-avatar {
  width: 52px;
  height: 52px;
  background: linear-gradient(135deg, #667EEA 0%, #764BA2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
  color: #FFFFFF;
}

.author-info {
  text-align: left;
}

.author-name {
  font-size: 17px;
  font-weight: 600;
  color: #FFFFFF;
  margin-bottom: 2px;
}

.author-title {
  font-size: 14px;
  font-weight: 400;
  color: #86868B;
}

/* Video Modal */
.video-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(10px);
}

.modal-content {
  position: relative;
  width: 100%;
  max-width: 1200px;
  background: #000000;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  animation: modalFadeIn 0.3s ease;
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.modal-close {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #FFFFFF;
  z-index: 10;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.video-wrapper {
  width: 100%;
  aspect-ratio: 16/9;
  background: #0A0A0A;
  position: relative;
}

.video-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  color: rgba(255, 255, 255, 0.6);
}

.play-icon-large {
  cursor: pointer;
  transition: transform 0.3s ease;
}

.play-icon-large:hover {
  transform: scale(1.1);
}

.video-placeholder p {
  font-size: 17px;
  letter-spacing: -0.01em;
}

/* Pricing Section */
.pricing-section {
  padding: 120px 48px;
  background: #000000;
}

.pricing-container {
  max-width: 1200px;
  margin: 0 auto;
}

.pricing-header {
  text-align: center;
  margin-bottom: 64px;
}

.pricing-header h2 {
  font-size: 40px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: #FFFFFF;
  margin-bottom: 16px;
}

.pricing-header p {
  font-size: 18px;
  color: #86868B;
  letter-spacing: -0.01em;
}

.pricing-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  align-items: stretch;
}

.pricing-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 32px;
  position: relative;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
}

.pricing-card:hover {
  border-color: rgba(255, 255, 255, 0.15);
  transform: translateY(-4px);
}

.pricing-card.featured {
  background: linear-gradient(180deg, rgba(10, 132, 255, 0.08) 0%, rgba(10, 132, 255, 0.02) 100%);
  border-color: rgba(10, 132, 255, 0.3);
  transform: scale(1.02);
}

.pricing-card.featured:hover {
  border-color: rgba(10, 132, 255, 0.5);
  transform: scale(1.02) translateY(-4px);
}

.featured-badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: #0A84FF;
  color: #FFFFFF;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 16px;
  border-radius: 20px;
  letter-spacing: -0.01em;
}

.pricing-card-header {
  margin-bottom: 24px;
}

.plan-name {
  font-size: 24px;
  font-weight: 600;
  color: #FFFFFF;
  margin-bottom: 8px;
  letter-spacing: -0.02em;
}

.plan-description {
  font-size: 14px;
  color: #86868B;
  letter-spacing: -0.01em;
}

.pricing-card-price {
  margin-bottom: 8px;
}

.price-amount {
  font-size: 48px;
  font-weight: 600;
  color: #FFFFFF;
  letter-spacing: -0.03em;
}

.price-period {
  font-size: 16px;
  color: #86868B;
  letter-spacing: -0.01em;
}

.price-annual {
  font-size: 13px;
  color: #0A84FF;
  margin-bottom: 24px;
  letter-spacing: -0.01em;
}

.pricing-features {
  list-style: none;
  padding: 0;
  margin: 0 0 32px 0;
  flex-grow: 1;
}

.pricing-features li {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
  letter-spacing: -0.01em;
  margin-bottom: 12px;
  line-height: 1.4;
}

.pricing-features li:last-child {
  margin-bottom: 0;
}

.feature-check {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  color: #30D158;
  margin-top: 1px;
}

.pricing-btn {
  width: 100%;
  padding: 14px 24px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: -0.01em;
  border: none;
}

.pricing-btn.primary {
  background: #0A84FF;
  color: #FFFFFF;
}

.pricing-btn.primary:hover {
  background: #0077ED;
}

.pricing-btn.secondary {
  background: transparent;
  color: #FFFFFF;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.pricing-btn.secondary:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.3);
}

/* CTA Section */
.cta-section {
  padding: 120px 48px;
  background: #0A0A0A;
}

.cta-container {
  max-width: 1000px;
  margin: 0 auto;
}

.cta-content {
  text-align: center;
}

.cta-content h2 {
  font-size: 56px;
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.015em;
  color: #FFFFFF;
  margin-bottom: 24px;
}

.cta-content p {
  font-size: 21px;
  font-weight: 400;
  color: #98989D;
  margin-bottom: 48px;
  letter-spacing: -0.01em;
}

.cta-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.btn-cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 16px 32px;
  border-radius: 980px;
  font-size: 17px;
  font-weight: 400;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  letter-spacing: -0.01em;
}

.btn-cta.primary {
  background: #FFFFFF;
  color: #000000;
}

.btn-cta.primary:hover {
  background: #E5E5E5;
  transform: scale(1.02);
}

.btn-cta.secondary {
  background: transparent;
  color: #FFFFFF;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.btn-cta.secondary:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* Footer */
.footer {
  background: #000000;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 60px 48px 32px 48px;
}

.footer-container {
  max-width: 1920px;
  margin: 0 auto;
}

.footer-content {
  padding-bottom: 32px;
  margin-bottom: 32px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.footer-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.footer-tagline {
  font-size: 14px;
  color: #86868B;
  letter-spacing: -0.01em;
}

.footer-logo {
  width: 28px;
  height: 28px;
  color: #FFFFFF;
}

.footer-brand-name {
  font-size: 17px;
  font-weight: 600;
  color: #FFFFFF;
}

.footer-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-legal {
  display: flex;
  align-items: center;
  gap: 32px;
  width: 100%;
  justify-content: space-between;
}

.footer-legal span {
  font-size: 12px;
  color: #6E6E73;
  letter-spacing: -0.01em;
}

.footer-legal-links {
  display: flex;
  gap: 24px;
}

.footer-legal-links a {
  font-size: 12px;
  color: #98989D;
  text-decoration: none;
  transition: color 0.2s ease;
  letter-spacing: -0.01em;
}

.footer-legal-links a:hover {
  color: #FFFFFF;
}

/* Responsive */
@media (max-width: 1024px) {
  .hero {
    padding: 60px 48px 100px 48px;
  }

  .hero-container {
    grid-template-columns: 1fr;
    gap: 60px;
  }

  .hero-title {
    font-size: 56px;
  }

  .features-section {
    padding: 100px 48px;
  }

  .section-header {
    margin-bottom: 60px;
  }

  .section-header h2 {
    font-size: 44px;
  }

  .features-showcase {
    min-height: 650px;
  }

  .central-image {
    width: 400px;
    height: 500px;
  }

  .floating-card {
    width: 260px;
    padding: 20px 24px;
  }

  .card-top-left {
    transform: translateX(40%);
  }

  .card-top-right {
    transform: translateX(-40%);
  }

  .card-bottom-left {
    transform: translateX(40%);
  }

  .card-bottom-right {
    transform: translateX(-40%);
  }

  .feature-card h3 {
    font-size: 16px;
  }

  .feature-card p {
    font-size: 13px;
  }

  .powered-by-section {
    padding: 80px 48px;
  }

  .powered-by-header h2 {
    font-size: 32px;
  }

  .model-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 40px;
  }

  .testimonial-section {
    padding: 100px 48px;
  }

  blockquote {
    font-size: 24px;
  }

  .cta-section {
    padding: 100px 48px;
  }

  .cta-content h2 {
    font-size: 44px;
  }

  .footer {
    padding: 48px 48px 24px 48px;
  }
}

@media (max-width: 768px) {
  .hero {
    padding: 40px 24px 80px 24px;
  }

  .hero-title {
    font-size: 40px;
  }

  .hero-subtitle {
    font-size: 19px;
  }

  .hero-actions {
    flex-direction: column;
    gap: 12px;
  }

  .btn-hero {
    width: 100%;
    justify-content: center;
  }

  .features-section {
    padding: 80px 24px;
  }

  .section-header {
    margin-bottom: 48px;
  }

  .section-header h2 {
    font-size: 32px;
  }

  .section-header p {
    font-size: 17px;
  }

  .features-showcase {
    flex-direction: column;
    min-height: auto;
    gap: 16px;
    padding: 0;
  }

  .central-image {
    width: 100%;
    max-width: 320px;
    height: 380px;
    order: -1;
    margin-bottom: 8px;
  }

  .floating-card {
    position: relative;
    width: 100%;
    top: auto !important;
    left: auto !important;
    right: auto !important;
    bottom: auto !important;
    transform: none !important;
  }

  .feature-card {
    padding: 20px 24px;
  }

  .feature-card:hover {
    transform: none !important;
  }

  .feature-card h3 {
    font-size: 16px;
  }

  .feature-card p {
    font-size: 14px;
  }

  .powered-by-section {
    padding: 60px 24px;
  }

  .powered-by-header h2 {
    font-size: 26px;
  }

  .model-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 32px;
  }

  .model-logo img {
    width: 40px;
    height: 40px;
  }

  .model-info h3 {
    font-size: 15px;
  }

  .model-org {
    font-size: 12px;
  }

  .testimonial-section {
    padding: 80px 24px;
  }

  blockquote {
    font-size: 20px;
  }

  .testimonial-author {
    flex-direction: column;
    gap: 12px;
  }

  .author-info {
    text-align: center;
  }

  .cta-section {
    padding: 80px 24px;
  }

  .cta-content h2 {
    font-size: 32px;
  }

  .cta-content p {
    font-size: 17px;
  }

  .cta-actions {
    flex-direction: column;
    gap: 12px;
  }

  .btn-cta {
    width: 100%;
    justify-content: center;
  }

  .footer {
    padding: 40px 24px 20px 24px;
  }

  .footer-legal {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }

  .footer-legal-links {
    justify-content: center;
  }
}
</style>
