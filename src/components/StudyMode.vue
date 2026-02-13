<script setup>
import { ref, computed } from 'vue'
import FlashCard from './FlashCard.vue'

const props = defineProps({
  cards: {
    type: Array,
    required: true
  },
  isAdmin: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update-status', 'edit-card', 'delete-card'])

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
    if (!props.isAdmin) {
      alert('Tebrikler! Bu oturumu tamamladın.')
    }
    currentIndex.value = 0
  }
}
</script>

<template>
  <div class="study-mode">
    <div v-if="cards.length > 0">
      <div class="header">
        <span class="count">Kart {{ currentIndex + 1 }} / {{ cards.length }}</span>
      </div>

      <div class="card-wrapper">
        <FlashCard 
          :card="currentCard" 
          :is-flipped="isFlipped" 
          @click="flipCard"
        />
        <div v-if="isAdmin" class="admin-card-controls">
          <button class="btn-sm btn-edit" @click.stop="$emit('edit-card', currentCard)">✏️ Düzenle</button>
          <button class="btn-sm btn-delete" @click.stop="$emit('delete-card', currentCard)">🗑️ Sil</button>
        </div>
      </div>

      <div class="controls" v-if="showResultButtons">
        <template v-if="isAdmin">
          <button class="btn-primary" @click.stop="nextCard">
            Sonraki Kart →
          </button>
        </template>
        <template v-else>
          <button class="btn-danger" @click.stop="handleResult('unknown')">
            Bilmiyorum
          </button>
          <button class="btn-success" @click.stop="handleResult('known')">
            Biliyorum
          </button>
        </template>
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

.controls {
  display: flex;
  gap: 1.5rem;
  min-height: 60px;
  align-items: center;
  justify-content: center;
}

.card-wrapper {
  position: relative;
  width: 100%;
}

.admin-card-controls {
  margin-top: 1rem;
  display: flex;
  justify-content: center;
  gap: 1rem;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.8rem;
}

.btn-edit {
  background: var(--primary);
  color: white;
}

.btn-delete {
  background: var(--danger);
  color: white;
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
