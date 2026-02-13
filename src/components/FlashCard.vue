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
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.flashcard-container {
  perspective: 1000px;
  width: 100%;
  max-width: 400px;
  height: 300px;
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
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
  padding: 2rem;
  box-sizing: border-box;
}

.back {
  transform: rotateY(180deg);
  background: rgba(0, 0, 0, 0.6); /* Slightly darker for contrast */
}

.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 2px;
  opacity: 0.6;
  color: var(--primary-light);
}

p {
  font-size: 1.5rem;
  font-weight: 500;
  line-height: 1.4;
}
</style>
