<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({
  initialLesson: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['add-card'])

const question = ref('')
const answer = ref('')
const category = ref('')
const lesson = ref(props.initialLesson || '')

const lessons = ['Tarih', 'Coğrafya', 'Vatandaşlık']

const submitCard = () => {
  if (!question.value || !answer.value || !lesson.value) {
    alert('Lütfen ders, soru ve cevap alanlarını doldurun.')
    return
  }

  const newCard = {
    id: Date.now(),
    lesson: lesson.value,
    category: category.value || 'Genel',
    question: question.value,
    answer: answer.value,
    status: 'unknown',
    timestamp: Date.now(),
    lastReviewed: null
  }

  emit('add-card', newCard)

  // Reset fields
  question.value = ''
  answer.value = ''
  // Keep lesson and category for faster entry of same topic
}
</script>

<template>
  <div class="card-form glassy">
    <h3>Yeni Kart Ekle</h3>
    
    <div class="form-group">
      <label>Ders *</label>
      <select v-model="lesson" :disabled="!!props.initialLesson">
        <option disabled value="">Ders Seçiniz</option>
        <option v-for="l in lessons" :key="l" :value="l">{{ l }}</option>
      </select>
    </div>

    <div class="form-group">
      <label>Konu / Kategori</label>
      <input 
        v-model="category" 
        type="text" 
        placeholder="Örn: İlk Çağ Uygarlıkları"
        autocomplete="off"
        name="card-category-input"
      >
    </div>

    <div class="form-group">
      <label>Soru *</label>
      <textarea 
        v-model="question" 
        placeholder="Soruyu buraya yazın..."
        rows="3"
      ></textarea>
    </div>

    <div class="form-group">
      <label>Cevap *</label>
      <textarea 
        v-model="answer" 
        placeholder="Cevabı buraya yazın..."
        rows="3"
      ></textarea>
    </div>

    <button class="btn-primary" @click="submitCard">Kartı Ekle</button>
  </div>
</template>

<style scoped>
.card-form {
  padding: 2rem;
  max-width: 500px;
  margin: 2rem auto;
}

.form-group {
  margin-bottom: 1.5rem;
  text-align: left;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #e0e7ff;
}

input, textarea, select {
  width: 100%;
  padding: 0.8rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(0, 0, 0, 0.2);
  color: white;
  font-family: inherit;
  transition: border-color 0.3s;
}

input:focus, textarea:focus, select:focus {
  outline: none;
  border-color: #a5b4fc;
  background: rgba(0, 0, 0, 0.3);
}

select option {
  background: #333;
  color: white;
}

.btn-primary {
  width: 100%;
  padding: 1rem;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}
</style>
