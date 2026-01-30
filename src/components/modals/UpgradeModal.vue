<template>
  <teleport to="body">
    <div class="modal-overlay" @click.self="handleClose">
      <div class="modal-card">
        <!-- Badge -->
        <div class="badge">Pro</div>

        <!-- Header -->
        <h1>Unlock Your Potential</h1>
        <p class="description">Continue your journey with unlimited access to adaptive learning.</p>

        <!-- Price -->
        <div class="price-block">
          <span class="price">{{ pricing.price }}</span>
          <span class="period">{{ pricing.period }}</span>
        </div>

        <!-- Features -->
        <ul class="features">
          <li v-for="(feature, index) in pricing.features" :key="index">
            <svg class="check" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
            </svg>
            <span>
              <strong v-if="feature.highlight">{{ feature.highlight }}</strong>
              {{ feature.text }}
            </span>
          </li>
        </ul>

        <!-- Actions -->
        <button class="btn-primary" @click="handleUpgrade" :disabled="isLoading">
          <span v-if="!isLoading">Continue</span>
          <span v-else class="spinner"></span>
        </button>
        <button class="btn-secondary" @click="handleClose">Not Now</button>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore } from '@/src/store/auth';
import { PRO_TIER, formatPrice } from '@/src/config/pricing';

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'upgrade-success'): void;
}>();

const authStore = useAuthStore();
const isLoading = ref(false);

// Pricing from centralized config
const pricing = computed(() => ({
  price: formatPrice(PRO_TIER.price.monthly),
  period: '/month',
  features: PRO_TIER.features,
}));

function handleClose() {
  emit('close');
}

async function handleUpgrade() {
  isLoading.value = true;

  try {
    const paystackPaymentUrl = import.meta.env.VITE_PAYSTACK_PAYMENT_URL;

    if (paystackPaymentUrl) {
      const checkoutUrl = new URL(paystackPaymentUrl);
      // Paystack Payment Pages support these query params
      if (authStore.userProfile?.uid) {
        checkoutUrl.searchParams.append('metadata[user_id]', authStore.userProfile.uid);
      }
      if (authStore.userProfile?.email) {
        checkoutUrl.searchParams.append('email', authStore.userProfile.email);
      }
      window.location.href = checkoutUrl.toString();
    } else {
      alert('Payment system is being configured.');
      isLoading.value = false;
    }
  } catch (error) {
    console.error('Failed to initiate checkout:', error);
    isLoading.value = false;
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
  background: linear-gradient(180deg, rgba(10, 132, 255, 0.08) 0%, rgba(10, 132, 255, 0.02) 100%);
  border: 1px solid rgba(10, 132, 255, 0.3);
  border-radius: 16px;
  padding: 40px 32px 32px;
  max-width: 380px;
  width: 100%;
  position: relative;
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

.badge {
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
  margin: 0 0 24px;
  line-height: 1.5;
}

.price-block {
  text-align: center;
  margin-bottom: 24px;
}

.price {
  font-size: 48px;
  font-weight: 600;
  color: #FFFFFF;
  letter-spacing: -0.03em;
}

.period {
  font-size: 16px;
  color: #86868B;
  letter-spacing: -0.01em;
}

.features {
  list-style: none;
  padding: 0;
  margin: 0 0 24px 0;
}

.features li {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
  letter-spacing: -0.01em;
  margin-bottom: 12px;
  line-height: 1.4;
}

.features li:last-child {
  margin-bottom: 0;
}

.check {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  color: #30D158;
  margin-top: 1px;
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

.btn-primary:hover:not(:disabled) {
  background: #0077ED;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
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
