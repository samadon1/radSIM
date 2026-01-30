<template>
  <div class="legal-page">
    <AppHeader />

    <div class="legal-container">
      <div class="legal-content">
        <h1>Privacy Policy</h1>
        <p class="last-updated">Last updated: January 2026</p>

        <section>
          <h2>1. Introduction</h2>
          <p>
            RADSIM ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our radiology training platform.
          </p>
        </section>

        <section>
          <h2>2. Information We Collect</h2>
          <h3>Personal Information</h3>
          <p>We may collect personal information that you voluntarily provide when you:</p>
          <ul>
            <li>Create an account (name, email address)</li>
            <li>Subscribe to our services</li>
            <li>Contact us for support</li>
          </ul>

          <h3>Usage Data</h3>
          <p>We automatically collect certain information when you use our platform:</p>
          <ul>
            <li>Learning progress and performance metrics</li>
            <li>Session duration and frequency</li>
            <li>Device and browser information</li>
            <li>IP address and general location</li>
          </ul>
        </section>

        <section>
          <h2>3. How We Use Your Information</h2>
          <p>We use the collected information to:</p>
          <ul>
            <li>Provide and maintain our educational services</li>
            <li>Personalize your learning experience through adaptive algorithms</li>
            <li>Track your progress and provide performance analytics</li>
            <li>Process payments and manage subscriptions</li>
            <li>Send important updates about our services</li>
            <li>Improve our platform and develop new features</li>
            <li>Respond to your inquiries and provide support</li>
          </ul>
        </section>

        <section>
          <h2>4. Data Security</h2>
          <p>
            We implement appropriate technical and organizational security measures to protect your personal information. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
          </p>
        </section>

        <section>
          <h2>5. Data Retention</h2>
          <p>
            We retain your personal information for as long as your account is active or as needed to provide you services. You may request deletion of your account and associated data at any time.
          </p>
        </section>

        <section>
          <h2>6. Third-Party Services</h2>
          <p>Our platform may use third-party services for:</p>
          <ul>
            <li>Authentication (Google Sign-In)</li>
            <li>Payment processing</li>
            <li>Analytics</li>
            <li>AI-powered features (Google Gemini)</li>
          </ul>
          <p>These services have their own privacy policies governing the use of your information.</p>
        </section>

        <section>
          <h2>7. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access your personal information</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Export your learning data</li>
            <li>Opt out of marketing communications</li>
          </ul>
        </section>

        <section>
          <h2>8. Children's Privacy</h2>
          <p>
            Our services are intended for medical professionals and students aged 18 and older. We do not knowingly collect information from children under 18.
          </p>
        </section>

        <section>
          <h2>9. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.
          </p>
        </section>

        <section>
          <h2>10. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, please contact us at:
          </p>
          <p class="contact-email">calvinsamueldonkor@gmail.com</p>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppHeader from './AppHeader.vue';
</script>

<style scoped>
.legal-page {
  min-height: 100vh;
  background: #000;
  color: #fff;
}

.legal-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 120px 24px 80px;
}

.legal-content h1 {
  font-size: 48px;
  font-weight: 600;
  letter-spacing: -0.02em;
  margin-bottom: 8px;
}

.last-updated {
  color: #86868B;
  font-size: 14px;
  margin-bottom: 48px;
}

section {
  margin-bottom: 40px;
}

h2 {
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.02em;
  margin-bottom: 16px;
  color: #fff;
}

h3 {
  font-size: 18px;
  font-weight: 500;
  margin: 20px 0 12px;
  color: #fff;
}

p {
  font-size: 16px;
  line-height: 1.7;
  color: #98989D;
  margin-bottom: 16px;
}

ul {
  margin: 0 0 16px 0;
  padding-left: 24px;
}

li {
  font-size: 16px;
  line-height: 1.7;
  color: #98989D;
  margin-bottom: 8px;
}

.contact-email {
  color: #0A84FF;
  font-weight: 500;
}

@media (max-width: 768px) {
  .legal-container {
    padding: 100px 20px 60px;
  }

  .legal-content h1 {
    font-size: 32px;
  }

  h2 {
    font-size: 20px;
  }
}
</style>
