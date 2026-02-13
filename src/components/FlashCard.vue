<script setup>
defineProps({
  card: {
    type: Object,
    required: true
  },
  isFlipped: {
    type: Boolean,
    default: false
  }
})
</script>

<template>
  <div class="flashcard-container">
    <div class="flashcard" :class="{ flipped: isFlipped }">
      <div class="front glassy">
        <div class="content">
          <span class="label">SORU</span>
          <p>{{ card.question }}</p>
        </div>
      </div>
      <div class="back glassy">
        <div class="content">
          <span class="label">CEVAP</span>
          <p>{{ card.answer }}</p>
          <span v-if="card.id" style="font-size: 9px; opacity: 0.2; position: absolute; bottom: 10px;">ID: {{ card.id.substring(0,6) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.flashcard-container {
  perspective: 1000px;
  width: 95%; /* Use almost full width on mobile */
  max-width: 500px; /* Wider for desktop */
  height: 550px; /* Taller for safety */
  margin: 0 auto;
  cursor: pointer;
}

.flashcard {
  position: relative;
  width: 100%;
  height: 100%;
  text-align: center;
  transition: transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  transform-style: preserve-3d;
}

.flashcard.flipped {
  transform: rotateY(180deg);
}

.front, .back {
  position: absolute;
  width: 100%;
  height: 100%;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  border-radius: 20px;
  padding: 1rem;
  box-sizing: border-box;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

/* Custom scrollbar */
.front::-webkit-scrollbar, .back::-webkit-scrollbar {
  width: 4px;
}
.front::-webkit-scrollbar-thumb, .back::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
}

.back {
  transform: rotateY(180deg);
  background: rgba(0, 0, 0, 0.9);
}

.content {
  margin: auto 0; /* Centering that supports overflow without clipping the top */
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  padding: 1.5rem 0;
  min-height: min-content;
}

.label {
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 3px;
  opacity: 0.6;
  color: var(--primary-light);
  text-transform: uppercase;
}

p {
  font-size: 1.6rem;
  font-weight: 500;
  line-height: 1.5;
  margin: 0;
  width: 100%;
  word-wrap: break-word;
  white-space: normal;
  color: #ffffff;
}

@media (max-width: 480px) {
  .flashcard-container {
    height: 520px; /* Even taller */
    max-width: none;
    width: 94vw; /* Even wider */
  }
  
  p {
    font-size: 1.25rem; /* Larger font back on mobile since we have room */
    line-height: 1.4;
  }
  
  .front, .back {
    padding: 1rem 0.75rem;
  }
}
</style>
