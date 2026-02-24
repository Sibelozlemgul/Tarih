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
    <div class="flashcard" :class="{ flipped: isFlipped }" translate="no">
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
  padding: 0; /* Let .content handle padding */
  box-sizing: border-box;
  overflow-y: auto;
  display: block; /* Standard block flow is the safest */
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
  background: rgba(0, 0, 0, 0.95);
}

.content {
  width: 100%;
  box-sizing: border-box;
  padding: 4rem 1.5rem; /* Padding for manual centering */
  text-align: center;
}

.label {
  display: block;
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 3px;
  opacity: 0.5;
  color: var(--primary-light);
  text-transform: uppercase;
  margin-bottom: 1.5rem;
}

p {
  font-size: 1.5rem;
  font-weight: 500;
  line-height: 1.6;
  margin: 0;
  padding: 0;
  width: 100%;
  word-wrap: break-word;
  white-space: normal;
  color: #ffffff;
}

@media (max-width: 480px) {
  .flashcard-container {
    height: 520px;
    max-width: none;
    width: 92vw;
  }
  
  .content {
    padding: 3rem 1rem;
  }

  p {
    font-size: 1.2rem;
    line-height: 1.5;
  }
}
</style>
