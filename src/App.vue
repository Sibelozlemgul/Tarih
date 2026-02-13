<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { db } from './firebase'
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore'
import CardForm from './components/CardForm.vue'
import StudyMode from './components/StudyMode.vue'

const cards = ref([])
const mode = ref('dashboard') // 'dashboard' | 'create' | 'study'
const sessionCards = ref([])
const selectedCategory = ref(null) // null means all
const printCategory = ref(null) // for PDF generation
const selectedLesson = ref(null) // 'Tarih', 'Coğrafya', 'Vatandaşlık' or null

const lessons = [
  { id: 'Tarih', emoji: '📜', colors: ['rgba(245, 158, 11, 0.2)', 'rgba(234, 88, 12, 0.2)'] },
  { id: 'Coğrafya', emoji: '🌍', colors: ['rgba(16, 185, 129, 0.2)', 'rgba(13, 148, 136, 0.2)'] },
  { id: 'Vatandaşlık', emoji: '⚖️', colors: ['rgba(59, 130, 246, 0.2)', 'rgba(79, 70, 229, 0.2)'] }
]

// Load from Firestore
onMounted(() => {
  const q = query(collection(db, 'flashcards'), orderBy('timestamp', 'desc'))
  
  onSnapshot(q, (snapshot) => {
    cards.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  })
})

// No local storage watch anymore

const addCard = async (card) => {
  // We ignore the local ID and let Firestore generate one
  const { id, ...cardData } = card
  
  try {
    await addDoc(collection(db, 'flashcards'), cardData)
    // Optionally go back to dashboard after adding
    mode.value = 'dashboard'
  } catch (e) {
    console.error("Error adding card: ", e)
    alert("Kart eklenirken bir hata oluştu.")
  }
}

const updateCardStatus = async ({ card, status }) => {
  const cardRef = doc(db, 'flashcards', card.id)
  try {
    await updateDoc(cardRef, {
      status: status,
      lastReviewed: Date.now()
    })
  } catch (e) {
    console.error("Error updating status: ", e)
  }
}

const selectLesson = (lessonId) => {
  selectedLesson.value = lessonId
  selectedCategory.value = null
}

const goHome = () => {
  selectedLesson.value = null
  mode.value = 'dashboard'
  selectedCategory.value = null
}

const startStudy = (category = null, reviewMode = false) => {
  selectedCategory.value = category
  
  // Filter by lesson AND category
  let pool = cards.value.filter(c => c.lesson === selectedLesson.value)
  
  if (category) {
    pool = pool.filter(c => c.category === category)
  }

  if (reviewMode) {
    // Show ONLY KNOWN cards for review
    sessionCards.value = pool.filter(c => c.status === 'known').sort(() => Math.random() - 0.5)
    if (sessionCards.value.length === 0) {
      alert('Bu kategoride tekrar edilecek kart yok!')
      return
    }
  } else {
    // Normal study: Prioritize unknown
    sessionCards.value = pool.filter(c => c.status !== 'known').sort((a, b) => a.timestamp - b.timestamp)
    
    if (sessionCards.value.length === 0) {
      if (confirm('Bu kategorideki tüm yeni kartları bitirdin! Bildiklerini tekrar etmek ister misin?')) {
        startStudy(category, true)
      }
      return
    }
  }
  
  mode.value = 'study'
}

const deleteCategory = async (category) => {
  if (confirm(`"${category}" setini ve içindeki TÜM kartları silmek istediğine emin misin?`)) {
    const cardsToDelete = cards.value.filter(c => c.category === category && c.lesson === selectedLesson.value)
    
    // Deleting one by one (Firestore doesn't support delete collection from client)
    for (const card of cardsToDelete) {
      try {
         await deleteDoc(doc(db, 'flashcards', card.id))
      } catch (e) {
        console.error("Error deleting card: ", e)
      }
    }
  }
}

const categories = computed(() => {
  if (!selectedLesson.value) return {}
  
  const cats = {}
  // Filter cards by selected lesson
  const lessonCards = cards.value.filter(c => c.lesson === selectedLesson.value)
  
  lessonCards.forEach(c => {
    const cat = c.category || 'Genel'
    if (!cats[cat]) {
      cats[cat] = { total: 0, unknown: 0, known: 0 }
    }
    cats[cat].total++
    if (c.status === 'known') cats[cat].known++
    else cats[cat].unknown++
  })
  return cats
})

const downloadPDF = async (categoryName = null) => {
  printCategory.value = categoryName
  
  await new Promise(r => setTimeout(r, 100))

  const element = document.querySelector('.print-container')
  element.style.display = 'block'
  
  try {
    const html2pdf = (await import('html2pdf.js')).default
    
    let filename = ''
    if (categoryName) {
      filename = `${selectedLesson.value}_${categoryName}.pdf`
    } else {
      filename = `${selectedLesson.value}_Tum_Kartlar.pdf`
    }

    const opt = {
      margin:       10,
      filename:     filename,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }

    await html2pdf().set(opt).from(element).save()
  } catch (error) {
    console.error('PDF error:', error)
    alert('PDF oluşturulamadı.')
  } finally {
    element.style.display = 'none'
    printCategory.value = null
  }
}
</script>

<template>
  <div class="app-container">
    <nav class="nav-bar glassy">
      <div class="logo">
        <span v-if="selectedLesson" class="back-arrow" @click="goHome">←</span>
        {{ selectedLesson ? selectedLesson : '🧠 KPSS Kartları' }}
      </div>
    </nav>

    <main class="main-content">
      <transition name="fade" mode="out-in">
        
        <!-- HOME VIEW: LESSON SELECTOR -->
        <div v-if="mode === 'dashboard' && !selectedLesson" key="home" class="home-grid">
          <div 
            v-for="lesson in lessons" 
            :key="lesson.id" 
            class="lesson-card glassy"
            @click="selectLesson(lesson.id)"
            :style="{ background: `linear-gradient(135deg, ${lesson.colors[0]}, ${lesson.colors[1]})` }"
          >
            <div class="lesson-emoji">{{ lesson.emoji }}</div>
            <h2>{{ lesson.id }}</h2>
            <p>{{ cards.filter(c => c.lesson === lesson.id).length }} Kart</p>
          </div>
        </div>

        <!-- LESSON VIEW: CATEGORIES -->
        <div v-else-if="mode === 'dashboard' && selectedLesson" key="lesson" class="dashboard">
          
          <div class="category-grid">
            <div 
              v-for="(stats, cat) in categories" 
              :key="cat" 
              class="category-card glassy"
            >
              <div @click="startStudy(cat)">
                <h3>{{ cat }}</h3>
                <div class="stats">
                  <span class="bad">{{ stats.unknown }} Öğrenilecek</span>
                  <span class="good">{{ stats.known }} Bilinen</span>
                </div>
                <div class="progress-mini">
                  <div class="bar" :style="{ width: (stats.known / stats.total * 100) + '%' }"></div>
                </div>
              </div>
              
              <button 
                v-if="stats.known > 0" 
                class="btn-review" 
                @click.stop="startStudy(cat, true)"
                title="Bildiklerini Tekrar Et"
              >
                ↻ Tekrar Et
              </button>
              
               <button 
                class="btn-delete" 
                @click.stop="deleteCategory(cat)"
                title="Seti Sil"
              >
                🗑️
              </button>

              <button 
                class="btn-pdf" 
                @click.stop="downloadPDF(cat)"
                title="PDF İndir"
              >
                İndir
              </button>
            </div>
          </div>
          
          <div v-if="Object.keys(categories).length === 0" class="empty-dashboard">
            <p>Bu derste henüz hiç kart yok.</p>
          </div>

          <div class="lesson-controls">
            <button v-if="Object.keys(categories).length > 0" class="btn-secondary" @click="downloadPDF(null)">
              💾 Tümünü İndir
            </button>
            <button class="btn-primary" @click="mode = 'create'">+ Yeni Kart Ekle</button>
          </div>
        </div>

        <!-- CREATE MODE -->
        <div v-else-if="mode === 'create'" key="create">
          <CardForm @add-card="addCard" :initial-lesson="selectedLesson" />
          <div class="back-link" @click="mode = 'dashboard'">← Geri Dön</div>
        </div>

        <!-- STUDY MODE -->
        <div v-else key="study">
          <div class="study-header">
            <h3>{{ selectedCategory || 'Tüm Konular' }}</h3>
            <button class="close-btn" @click="mode = 'dashboard'">✕ Çık</button>
          </div>
          <StudyMode 
            :cards="sessionCards" 
            @update-status="updateCardStatus" 
          />
        </div>
      </transition>
    </main>
  </div>

  <!-- PRINT-ONLY VIEW -->
  <div class="print-container">
    <h1>{{ selectedLesson || 'Tarih' }} - {{ printCategory || 'Tüm Konular' }}</h1>
    <div 
      v-for="(stats, cat) in categories" 
      :key="cat" 
      class="print-category"
      v-show="!printCategory || printCategory === cat"
    >
      <h2>{{ cat }}</h2>
      <div class="print-grid">
        <div 
          v-for="card in cards.filter(c => c.lesson === selectedLesson && (c.category || 'Genel') === cat)" 
          :key="card.id" 
          class="print-card"
        >
          <div class="print-q"><strong>S:</strong> {{ card.question }}</div>
          <div class="print-a"><strong>C:</strong> {{ card.answer }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  max-width: 800px;
  margin: 0 auto;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.nav-bar {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem 2rem;
  margin-bottom: 3rem;
  position: sticky;
  top: 1rem;
  z-index: 100;
}

.logo {
  font-weight: 800;
  font-size: 1.5rem;
  background: linear-gradient(to right, #a5b4fc, #e0e7ff);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  display: flex;
  align-items: center;
  gap: 10px;
}

.back-arrow {
  cursor: pointer;
  color: white; /* Fallback */
  -webkit-text-fill-color: white;
  font-size: 1.8rem;
  transition: transform 0.2s;
}

.back-arrow:hover {
  transform: translateX(-5px);
}

/* HOME GRID (LESSONS) */
.home-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 2rem;
  padding: 1rem;
}

.lesson-card {
  padding: 3rem 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.lesson-card:hover {
  transform: translateY(-8px);
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.3);
}

.lesson-emoji {
  font-size: 4rem;
  margin-bottom: 0.5rem;
}

.lesson-card h2 {
  font-size: 1.8rem;
  margin: 0;
  font-weight: 700;
}

.lesson-card p {
  opacity: 0.6;
  margin: 0;
}

/* CATEGORY GRID used in Lesson View */
.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;
}

.category-card {
  padding: 1.5rem 1.5rem 3rem 1.5rem;
  cursor: pointer;
  transition: transform 0.3s ease, border-color 0.3s;
  text-align: left;
  position: relative;
}

.category-card:hover {
  transform: translateY(-5px);
  border-color: var(--primary-light);
}

.category-card h3 {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  padding-right: 70px; /* Prevent overlap with download button */
}

.category-card .stats {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  margin-bottom: 0.8rem;
}

.bad { color: var(--danger); }
.good { color: var(--success); }

.progress-mini {
  height: 4px;
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
  overflow: hidden;
}
.progress-mini .bar {
  height: 100%;
  background: var(--success);
}

.btn-review {
  margin-top: 1rem;
  width: 100%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: var(--text-light);
  font-size: 0.8rem;
  padding: 0.5rem;
  border-radius: 8px;
}

.btn-review:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.btn-delete {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: transparent;
  border: none;
  font-size: 1.1rem;
  opacity: 0;
  transition: opacity 0.2s;
  padding: 5px;
  color: var(--danger);
  z-index: 10;
}

.category-card:hover .btn-delete {
  opacity: 1;
}

.btn-delete:hover {
  transform: scale(1.2);
}

.btn-pdf {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 0.75rem;
  padding: 4px 12px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: 0.5px;
  z-index: 10;
}

.btn-pdf:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.lesson-controls {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid rgba(255,255,255,0.1);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
}

.btn-primary {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  padding: 1rem 2rem;
  font-size: 1rem;
  cursor: pointer;
  width: 100%;
  max-width: 400px;
  transition: transform 0.2s;
}

.btn-primary:hover {
  transform: translateY(-2px);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 0.8rem 1.5rem;
  font-size: 0.9rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  max-width: 400px;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.2);
}

.back-link {
  margin-top: 1rem;
  cursor: pointer;
  opacity: 0.6;
}
.back-link:hover { opacity: 1; }

.study-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.close-btn {
  background: none;
  border: 1px solid rgba(255,255,255,0.2);
  color: white;
  padding: 0.4rem 0.8rem;
  font-size: 0.8rem;
}

/* PRINT STYLES - used by html2pdf */
.print-container {
  display: none;
  background: white;
  color: black;
  padding: 20px;
}

.print-container h1 { 
  text-align: center; 
  border-bottom: 2px solid #333; 
  padding-bottom: 1rem;
  margin-bottom: 2rem;
  font-size: 24px;
}

.print-category {
  margin-bottom: 2rem;
  page-break-inside: avoid;
}

.print-category h2 { 
  margin-top: 0; 
  border-bottom: 1px solid #ccc; 
  margin-bottom: 1rem;
  font-size: 18px;
  color: #333;
}

.print-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.print-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  background: #f9f9f9;
  page-break-inside: avoid;
}

.print-q { 
  font-weight: bold; 
  font-size: 14px; 
  margin-bottom: 8px; 
  color: #000; 
}

.print-a { 
  font-style: italic; 
  color: #444; 
  font-size: 14px;
}
</style>
