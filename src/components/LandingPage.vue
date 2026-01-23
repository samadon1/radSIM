<template>
  <div class="landing-page">
    <!-- Navigation -->
    <nav class="navbar">
      <div class="nav-container">
        <div class="nav-left">
          <div class="nav-brand">
            <svg class="logo" viewBox="0 0 32 32" fill="none">
              <rect x="4" y="4" width="10" height="10" rx="2" fill="currentColor"/>
              <rect x="18" y="4" width="10" height="10" rx="2" fill="currentColor" opacity="0.7"/>
              <rect x="4" y="18" width="10" height="10" rx="2" fill="currentColor" opacity="0.5"/>
              <rect x="18" y="18" width="10" height="10" rx="2" fill="currentColor" opacity="0.3"/>
            </svg>
            <span class="brand-name">RADSIM</span>
          </div>

          <div class="nav-menu">
            <a href="#home" class="nav-link">HOME</a>
            <a href="#pricing" class="nav-link">PRICING</a>
            <a href="#shorts" class="nav-link">SHORTS</a>
            <a href="#ai-tutor" class="nav-link">AI TUTOR</a>
            <a href="#about" class="nav-link">ABOUT US</a>
            <a href="#contact" class="nav-link">CONTACT</a>
          </div>
        </div>

        <div class="nav-actions">
          <button class="btn-login">LOGIN</button>
          <button class="btn-signup">SIGN UP</button>
        </div>
      </div>
    </nav>

    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-container">
        <div class="hero-content">
          <h1 class="hero-title">RADSIM</h1>
          <p class="hero-subtitle">Changing the way we learn Radiology</p>

          <div class="hero-description">
            <p>Revolutionizing Radiology Education</p>
            <p>with AI and Innovation</p>
          </div>

          <div class="hero-actions">
            <button class="btn-hero" @click="startLearning">Learning</button>
            <button class="btn-hero" @click="startExams">Exams</button>
          </div>
        </div>

        <div class="hero-visual">
          <!-- Video Placeholder -->
          <div class="video-container">
            <div class="video-placeholder">
              <div class="play-icon">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                  <circle cx="32" cy="32" r="32" fill="rgba(255,255,255,0.2)"/>
                  <path d="M26 20L44 32L26 44V20Z" fill="white"/>
                </svg>
              </div>
              <div class="video-text">Demo Video Placeholder</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- AI Tutor Section -->
    <section class="ai-tutor">
      <div class="ai-tutor-container">
        <h2>Meet Cubey</h2>
        <p class="ai-subtitle">your personal AI tutor</p>

        <div class="cubey-section">
          <div class="cubey-grid">
            <div class="feature-item feature-top-left">
              <span>Real time</span>
              <span>feedback</span>
            </div>

            <div class="feature-item feature-top-right">
              <span>Personalised</span>
              <span>responses</span>
            </div>

            <div class="cubey-visual">
              <svg class="cube-icon" viewBox="0 0 200 200">
                <!-- 3D Cube -->
                <polygon points="100,40 160,75 160,140 100,175 40,140 40,75" fill="#4A4A4A"/>
                <polygon points="100,40 160,75 100,110 40,75" fill="#B8B8B8"/>
                <polygon points="100,110 160,75 160,140 100,175" fill="#707070"/>
                <polygon points="40,75 40,140 100,175 100,110" fill="#909090"/>
              </svg>
            </div>

            <div class="feature-item feature-bottom-left">
              <span>Interactive</span>
              <span>experience</span>
            </div>

            <div class="feature-item feature-bottom-right">
              <span>Improves</span>
              <span>reporting</span>
            </div>
          </div>
        </div>

        <div class="cubey-footer">
          <p>and much</p>
          <p>more</p>
        </div>

        <button class="btn-trial" @click="startTrial">Start Your Free Trial</button>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="cta-section">
      <div class="cta-container">
        <h2>Begin your journey with RadSim</h2>
        <p class="cta-description">
          Trainees are already using RadSim to sharpen their skills, build confidence, and get exam-ready.<br>
          Now it's your turn.
        </p>
        <p class="cta-encouragement">Give yourself the best chance of success.</p>
        <button class="btn-cta" @click="startPracticing">Start practicing today!</button>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <div class="footer-container">
        <div class="footer-left">
          <p>RADSIM &copy; 2025</p>
        </div>
        <div class="footer-links">
          <a href="#">Terms & Conditions</a>
          <a href="#">Privacy Policy</a>
          <a href="#">Cookie Policy</a>
        </div>
        <div class="footer-social">
          <a href="#" class="social-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10"/>
            </svg>
          </a>
          <a href="#" class="social-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <rect x="2" y="2" width="20" height="20" rx="2"/>
            </svg>
          </a>
          <a href="#" class="social-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <rect x="2" y="6" width="20" height="12" rx="2"/>
            </svg>
          </a>
          <a href="#" class="social-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22 4L2 4L12 14L22 4ZM2 4L2 20L22 20L22 4"/>
            </svg>
          </a>
          <a href="#" class="social-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10"/>
            </svg>
          </a>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

const startLearning = () => {
  console.log('Start learning');
  // Navigate to learning mode
};

const startExams = () => {
  console.log('Start exams');
  // Navigate to exam mode
};

const startTrial = () => {
  console.log('Start trial');
};

const startPracticing = () => {
  console.log('Start practicing');
};
</script>

<style>
/* Global overrides for landing page - must not be scoped */
html {
  overflow: auto !important;
}

body {
  position: static !important;
  width: 100% !important;
  height: auto !important;
  overflow-y: auto !important;
}
</style>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.landing-page {
  background: #0A0A0A;
  color: #FFFFFF;
  width: 100%;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* Navigation */
.navbar {
  background: #0A0A0A;
  border-bottom: 1px solid #1A1A1A;
  position: sticky;
  top: 0;
  z-index: 1000;
}

.nav-container {
  max-width: 1920px;
  margin: 0 auto;
  padding: 0 48px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 64px;
  flex: 1;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  color: #FFFFFF;
  width: 40px;
  height: 40px;
}

.brand-name {
  font-size: 24px;
  font-weight: 700;
  color: #FFFFFF;
  letter-spacing: 1px;
}

.nav-menu {
  display: flex;
  gap: 48px;
  align-items: center;
}

.nav-link {
  color: #AAAAAA;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.5px;
  transition: color 0.2s;
}

.nav-link:hover {
  color: #FFFFFF;
}

.nav-actions {
  display: flex;
  gap: 16px;
  align-items: center;
}

.btn-login {
  background: transparent;
  border: none;
  color: #AAAAAA;
  font-size: 14px;
  font-weight: 500;
  padding: 10px 24px;
  cursor: pointer;
  transition: color 0.2s;
  letter-spacing: 0.5px;
}

.btn-login:hover {
  color: #FFFFFF;
}

.btn-signup {
  background: transparent;
  color: #FFFFFF;
  border: 1px solid #333333;
  padding: 10px 24px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  letter-spacing: 0.5px;
}

.btn-signup:hover {
  background: #FFFFFF;
  color: #0A0A0A;
}

/* Hero Section */
.hero {
  min-height: 100vh;
  display: flex;
  align-items: center;
  padding: 40px 48px 80px 48px;
  background: #0A0A0A;
}

.hero-container {
  width: 100%;
  max-width: 1920px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 80px;
  align-items: center;
}

.hero-content {
  text-align: left;
}

.hero-title {
  font-size: 120px;
  font-weight: 700;
  margin-bottom: 24px;
  letter-spacing: -3px;
  line-height: 1;
}

.hero-subtitle {
  font-size: 28px;
  color: #AAAAAA;
  margin-bottom: 80px;
  font-weight: 300;
}

.hero-description {
  margin-bottom: 80px;
}

.hero-description p {
  font-size: 32px;
  font-weight: 400;
  line-height: 1.3;
  color: #FFFFFF;
}

.hero-actions {
  display: flex;
  gap: 24px;
}

.btn-hero {
  background: #1A1A1A;
  color: #FFFFFF;
  border: 1px solid #333333;
  padding: 24px 64px;
  border-radius: 8px;
  font-size: 20px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-hero:hover {
  background: #FFFFFF;
  color: #0A0A0A;
  transform: translateY(-2px);
}

/* Video Container */
.video-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-placeholder {
  width: 100%;
  aspect-ratio: 16/9;
  background: linear-gradient(135deg, #1A1A1A 0%, #2A2A2A 100%);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  border: 1px solid #333333;
  position: relative;
  overflow: hidden;
}

.video-placeholder::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at center, rgba(255,255,255,0.05) 0%, transparent 70%);
}

.play-icon {
  cursor: pointer;
  transition: transform 0.3s;
  z-index: 1;
}

.play-icon:hover {
  transform: scale(1.1);
}

.video-text {
  font-size: 18px;
  color: #AAAAAA;
  font-weight: 500;
  z-index: 1;
}

/* AI Tutor Section */
.ai-tutor {
  min-height: 100vh;
  display: flex;
  align-items: center;
  padding: 80px 80px;
  background: #0A0A0A;
}

.ai-tutor-container {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  text-align: center;
}

.ai-tutor-container h2 {
  font-size: 96px;
  font-weight: 700;
  margin-bottom: 16px;
  letter-spacing: -2px;
}

.ai-subtitle {
  font-size: 32px;
  color: #AAAAAA;
  margin-bottom: 100px;
  font-weight: 300;
}

.cubey-section {
  margin-bottom: 80px;
}

.cubey-grid {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  grid-template-rows: auto auto;
  gap: 60px 120px;
  max-width: 1200px;
  margin: 0 auto;
  align-items: center;
}

.cubey-visual {
  grid-column: 2;
  grid-row: 1 / 3;
  display: flex;
  justify-content: center;
  align-items: center;
}

.cube-icon {
  width: 280px;
  height: 280px;
}

.feature-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.feature-item span {
  font-size: 26px;
  font-weight: 400;
  color: #FFFFFF;
}

.feature-top-left {
  grid-column: 1;
  grid-row: 1;
  text-align: right;
  justify-self: end;
}

.feature-top-right {
  grid-column: 3;
  grid-row: 1;
  text-align: left;
  justify-self: start;
}

.feature-bottom-left {
  grid-column: 1;
  grid-row: 2;
  text-align: right;
  justify-self: end;
}

.feature-bottom-right {
  grid-column: 3;
  grid-row: 2;
  text-align: left;
  justify-self: start;
}

.cubey-footer {
  margin-bottom: 80px;
}

.cubey-footer p {
  font-size: 24px;
  color: #AAAAAA;
  font-weight: 300;
}

.btn-trial {
  background: #1A1A1A;
  color: #FFFFFF;
  border: 1px solid #333333;
  padding: 22px 56px;
  border-radius: 8px;
  font-size: 20px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-trial:hover {
  background: #FFFFFF;
  color: #0A0A0A;
  transform: translateY(-2px);
}

/* CTA Section */
.cta-section {
  min-height: 100vh;
  display: flex;
  align-items: center;
  padding: 80px 80px;
  background: #0A0A0A;
}

.cta-container {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  text-align: center;
}

.cta-container h2 {
  font-size: 72px;
  font-weight: 700;
  margin-bottom: 48px;
  letter-spacing: -1.5px;
}

.cta-description {
  font-size: 22px;
  color: #AAAAAA;
  line-height: 1.8;
  margin-bottom: 40px;
}

.cta-encouragement {
  font-size: 22px;
  color: #FFFFFF;
  margin-bottom: 70px;
  font-weight: 400;
}

.btn-cta {
  background: #E5E5E5;
  color: #0A0A0A;
  border: none;
  padding: 24px 64px;
  border-radius: 8px;
  font-size: 20px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-cta:hover {
  background: #FFFFFF;
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(255,255,255,0.1);
}

/* Footer */
.footer {
  background: #0A0A0A;
  padding: 60px 48px 40px;
  border-top: 1px solid #1A1A1A;
}

.footer-container {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-left p {
  font-size: 14px;
  color: #AAAAAA;
}

.footer-links {
  display: flex;
  gap: 32px;
}

.footer-links a {
  color: #AAAAAA;
  text-decoration: none;
  font-size: 14px;
  transition: color 0.2s;
}

.footer-links a:hover {
  color: #FFFFFF;
}

.footer-social {
  display: flex;
  gap: 16px;
}

.social-icon {
  color: #AAAAAA;
  transition: color 0.2s;
  width: 24px;
  height: 24px;
}

.social-icon:hover {
  color: #FFFFFF;
}

/* Responsive */
@media (max-width: 1024px) {
  .hero-container {
    grid-template-columns: 1fr;
    gap: 60px;
  }

  .hero-title {
    font-size: 64px;
  }

  .hero-description p {
    font-size: 24px;
  }

  .cubey-grid {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
    gap: 40px;
  }

  .cubey-visual {
    grid-column: 1;
    grid-row: 2;
  }

  .feature-top-left {
    grid-column: 1;
    grid-row: 1;
    text-align: center;
    justify-self: center;
  }

  .feature-top-right {
    grid-column: 1;
    grid-row: 3;
    text-align: center;
    justify-self: center;
  }

  .feature-bottom-left {
    grid-column: 1;
    grid-row: 4;
    text-align: center;
    justify-self: center;
  }

  .feature-bottom-right {
    grid-column: 1;
    grid-row: 5;
    text-align: center;
    justify-self: center;
  }

  .ai-tutor-container h2 {
    font-size: 56px;
  }
}

@media (max-width: 768px) {
  .nav-menu {
    display: none;
  }

  .hero-title {
    font-size: 48px;
  }

  .hero-description p {
    font-size: 20px;
  }

  .cta-container h2 {
    font-size: 36px;
  }

  .footer-container {
    flex-direction: column;
    gap: 32px;
    text-align: center;
  }

  .footer-links {
    flex-direction: column;
    gap: 16px;
  }
}
</style>
