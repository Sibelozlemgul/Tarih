<script setup>
import { ref, computed } from 'vue'
import FlashCard from './FlashCard.vue'

const props = defineProps({
  cards: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['update-status'])

const currentIndex = ref(0)
const isFlipped = ref(false)
const showResultButtons = ref(false)

const currentCard = computed(() => {
  return props.cards[currentIndex.value]
})

const progress = computed(() => {
  if (props.cards.length === 0) return 0
  return ((currentIndex.value) / props.cards.length) * 100
})

const flipCard = () => {
  if (!showResultButtons.value) {
    isFlipped.value = true
    showResultButtons.value = true
  } else {
    // If already flipped, clicking again could toggle back or do nothing.
    // Let's toggle for better UX.
    isFlipped.value = !isFlipped.value
  }
}

const handleResult = (status) => {
  // Emit event to update card status (known/unknown)
  emit('update-status', { card: currentCard.value, status })
  
  // Move to next card
  nextCard()
}

const nextCard = () => {
  isFlipped.value = false
  showResultButtons.value = false
  
  if (currentIndex.value < props.cards.length - 1) {
    setTimeout(() => {
      currentIndex.value++
    }, 300) // Wait for flip back
  } else {
    // Session finished
    alert('Tebrikler! Bu oturumu tamamladın.')
    currentIndex.value = 0
  }
}
</script>

<template>
  <div class="study-mode">
    <div v-if="cards.length > 0">
      <div class="header">
        <span class="count">Kart {{ currentIndex + 1 }} / {{ cards.length }}</span>
        <div class="progress-bar">
          <div class="progress" :style="{ width: progress + '%' }"></div>
        </div>
      </div>

      <FlashCard 
        :card="currentCard" 
        :is-flipped="isFlipped" 
        @click="flipCard"
      />

      <div class="controls" v-if="showResultButtons">
        <button class="btn-danger" @click.stop="handleResult('unknown')">
          Bilmiyorum
        </button>
        <button class="btn-success" @click.stop="handleResult('known')">
          Biliyorum
        </button>
      </div>
      <div class="controls" v-else>
        <p class="hint">Cevabı görmek için karta tıkla</p>
      </div>
    </div>
    <div v-else class="empty-state">
      <p>Çalışılacak kart bulunamadı. Önce kart ekleyin!</p>
    </div>
  </div>
</template>

<style scoped>
.study-mode {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
}

.header {
  width: 100%;
  text-align: center;
}

.count {
  font-size: 0.9rem;
  opacity: 0.7;
  margin-bottom: 0.5rem;
  display: block;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.progress {
  height: 100%;
  background: var(--success);
  transition: width 0.3s ease;
}

.controls {
  display: flex;
  gap: 1.5rem;
  min-height: 60px;
  align-items: center;
  justify-content: center;
}

.hint {
  opacity: 0.5;
  font-style: italic;
  animation: pulse 2s infinite;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
}

@keyframes pulse {
  0% { opacity: 0.3; }
  50% { opacity: 0.7; }
  100% { opacity: 0.3; }
}
</style>
