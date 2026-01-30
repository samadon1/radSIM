<template>
  <div class="legal-page">
    <AppHeader />

    <div class="legal-container">
      <div class="legal-content">
        <h1>Terms of Service</h1>
        <p class="last-updated">Last updated: January 2026</p>

        <section>
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using RADSIM ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our Service.
          </p>
        </section>

        <section>
          <h2>2. Description of Service</h2>
          <p>
            RADSIM is an educational platform designed to help medical professionals and students improve their radiology interpretation skills through interactive case-based learning, AI-powered feedback, and adaptive training algorithms.
          </p>
        </section>

        <section>
          <h2>3. Educational Purpose Only</h2>
          <p>
            <strong>Important:</strong> RADSIM is designed solely for educational and training purposes. The Service is NOT intended to:
          </p>
          <ul>
            <li>Replace professional medical judgment</li>
            <li>Provide clinical diagnoses for real patients</li>
            <li>Serve as a substitute for proper medical training or supervision</li>
            <li>Be used in actual clinical decision-making</li>
          </ul>
          <p>
            All cases presented are for learning purposes only. Users should always follow proper clinical protocols and consult appropriate medical professionals for real patient care.
          </p>
        </section>

        <section>
          <h2>4. User Accounts</h2>
          <p>To use certain features of the Service, you must create an account. You agree to:</p>
          <ul>
            <li>Provide accurate and complete registration information</li>
            <li>Maintain the security of your account credentials</li>
            <li>Notify us immediately of any unauthorized access</li>
            <li>Accept responsibility for all activities under your account</li>
          </ul>
        </section>

        <section>
          <h2>5. Subscription and Payments</h2>
          <p>
            Certain features of RADSIM require a paid subscription. By subscribing, you agree to:
          </p>
          <ul>
            <li>Pay the applicable subscription fees</li>
            <li>Automatic renewal unless cancelled before the renewal date</li>
            <li>No refunds for partial subscription periods</li>
          </ul>
          <p>
            We reserve the right to change subscription prices with reasonable notice to existing subscribers.
          </p>
        </section>

        <section>
          <h2>6. Acceptable Use</h2>
          <p>You agree NOT to:</p>
          <ul>
            <li>Share your account credentials with others</li>
            <li>Copy, distribute, or reproduce our educational content</li>
            <li>Attempt to reverse engineer or extract our algorithms</li>
            <li>Use the Service for any unlawful purpose</li>
            <li>Interfere with the proper functioning of the Service</li>
            <li>Use the Service to train competing AI models</li>
          </ul>
        </section>

        <section>
          <h2>7. Intellectual Property</h2>
          <p>
            All content, features, and functionality of the Service, including but not limited to text, graphics, images, educational materials, algorithms, and software, are owned by RADSIM and protected by copyright, trademark, and other intellectual property laws.
          </p>
        </section>

        <section>
          <h2>8. AI-Generated Content</h2>
          <p>
            Our Service uses artificial intelligence to provide educational feedback and analysis. While we strive for accuracy, AI-generated content may occasionally contain errors. Users should:
          </p>
          <ul>
            <li>Use AI feedback as a learning aid, not as authoritative medical guidance</li>
            <li>Verify important information through established medical resources</li>
            <li>Report any apparent errors or concerns to our support team</li>
          </ul>
        </section>

        <section>
          <h2>9. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, RADSIM SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE.
          </p>
          <p>
            We are not responsible for any medical decisions made based on the educational content provided through our Service.
          </p>
        </section>

        <section>
          <h2>10. Disclaimer of Warranties</h2>
          <p>
            THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DO NOT GUARANTEE THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR THAT IT WILL MEET YOUR SPECIFIC EDUCATIONAL NEEDS.
          </p>
        </section>

        <section>
          <h2>11. Termination</h2>
          <p>
            We may suspend or terminate your access to the Service at any time for violation of these Terms or for any other reason at our discretion. You may cancel your account at any time through your account settings.
          </p>
        </section>

        <section>
          <h2>12. Changes to Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. We will notify users of significant changes via email or through the Service. Continued use of the Service after changes constitutes acceptance of the new Terms.
          </p>
        </section>

        <section>
          <h2>13. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles.
          </p>
        </section>

        <section>
          <h2>14. Contact Information</h2>
          <p>
            For questions about these Terms of Service, please contact us at:
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

p strong {
  color: #fff;
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
