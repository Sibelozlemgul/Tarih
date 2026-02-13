<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { db, auth } from './firebase'
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy, setDoc, where } from 'firebase/firestore'
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth'
import CardForm from './components/CardForm.vue'
import StudyMode from './components/StudyMode.vue'

// Data
const rawCards = ref([]) // Master content from 'flashcards' collection
const userProgress = ref({}) // Map: cardId -> status ('known' | 'unknown')
const mode = ref('dashboard') // 'dashboard' | 'create' | 'study'
const sessionCards = ref([])
const selectedCategory = ref(null) // null means all
const printCategory = ref(null) // for PDF generation
const selectedLesson = ref(null) // 'Tarih', 'Coğrafya', 'Vatandaşlık' or null

// Auth State
const user = ref(null)
const isAdmin = ref(false)
const showLogin = ref(false)
const isRegisterMode = ref(false)
const email = ref('')
const password = ref('')
const fullName = ref('')

// Constants
const lessons = [
  { id: 'Tarih', emoji: '📜', colors: ['rgba(245, 158, 11, 0.2)', 'rgba(234, 88, 12, 0.2)'] },
  { id: 'Coğrafya', emoji: '🌍', colors: ['rgba(16, 185, 129, 0.2)', 'rgba(13, 148, 136, 0.2)'] },
  { id: 'Vatandaşlık', emoji: '⚖️', colors: ['rgba(59, 130, 246, 0.2)', 'rgba(79, 70, 229, 0.2)'] }
]

// Computed: Merges Master Data + User Progress
const cards = computed(() => {
  return rawCards.value.map(card => ({
    ...card,
    status: userProgress.value[card.id] || 'new' // Default to 'new' if no progress found
  }))
})

// Lifecycle
let progressUnsub = null

onMounted(() => {
  // 1. Listen to Master Data (Flashcards) - Always active
  const q = query(collection(db, 'flashcards'), orderBy('timestamp', 'desc'))
  onSnapshot(q, (snapshot) => {
    rawCards.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  })

  // 2. Auth Listener
  onAuthStateChanged(auth, (currentUser) => {
    user.value = currentUser
    
    // Check Admin
    if (currentUser && currentUser.email === 'sibelozlemgul811@gmail.com') {
      isAdmin.value = true
    } else {
      isAdmin.value = false
    }

    // 3. Listen to User Progress (Only if logged in)
    if (currentUser) {
      const pQ = query(collection(db, 'user_progress'), where('userId', '==', currentUser.uid))
      progressUnsub = onSnapshot(pQ, (snapshot) => {
        const progressMap = {}
        snapshot.docs.forEach(doc => {
          const data = doc.data()
          progressMap[data.cardId] = data.status
        })
        userProgress.value = progressMap
      })
    } else {
      if (progressUnsub) progressUnsub()
      userProgress.value = {} // Reset progress on logout
    }
  })
})

const handleAuth = async () => {
  try {
    if (isRegisterMode.value) {
      const userCredential = await createUserWithEmailAndPassword(auth, email.value, password.value)
      // Save Full Name
      await updateProfile(userCredential.user, {
        displayName: fullName.value
      })
      alert("Kayıt başarılı! Hoşgeldiniz, " + fullName.value)
    } else {
      await signInWithEmailAndPassword(auth, email.value, password.value)
    }
    showLogin.value = false
    email.value = ''
    password.value = ''
    fullName.value = ''
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      alert('Bu e-posta adresi zaten kullanımda. Lütfen "Giriş Yap" seçeneğini kullanın.')
    } else {
      alert('İşlem başarısız: ' + error.message)
    }
  }
}

const handleLogout = async () => {
  if (confirm('Çıkış yapmak istediğine emin misin?')) {
    await signOut(auth)
    mode.value = 'dashboard'
  }
}

const addCard = async (card) => {
  if (!isAdmin.value) return 
  
  const { id, ...cardData } = card
  try {
    await addDoc(collection(db, 'flashcards'), cardData)
    mode.value = 'dashboard'
  } catch (e) {
    console.error("Error adding card: ", e)
    alert("Kart eklenirken bir hata oluştu.")
  }
}

const updateCardStatus = async ({ card, status }) => {
  if (!user.value) {
    alert("İlerlemenizi kaydetmek için giriş yapmalısınız.")
    return
  }

  // Create a composite ID for the progress document: userId_cardId
  const progressDocId = `${user.value.uid}_${card.id}`
  const progressRef = doc(db, 'user_progress', progressDocId)

  try {
    await setDoc(progressRef, {
      userId: user.value.uid,
      cardId: card.id,
      status: status,
      lastReviewed: Date.now()
    }, { merge: true })
    
    // Local update for immediate feedback (though snapshot will handle it)
    userProgress.value[card.id] = status
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
  if (!user.value && !isAdmin.value) {
    // Optional: Force login to study? Or allow guest study without saving?
    // User requested "saving per user", so let's warn.
    if (!confirm("Giriş yapmadığınız için ilerlemeniz kaydedilmeyecek. Devam etmek istiyor musunuz?")) {
      showLogin.value = true
      return
    }
  }

  selectedCategory.value = category
  
  // Filter by lesson AND category using the COMPUTED cards (which have merged status)
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
    // Normal study: Prioritize unknown/new
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
  if (!isAdmin.value) return

  if (confirm(`"${category}" setini ve içindeki TÜM kartları silmek istediğine emin misin? (YÖNETİCİ İŞLEMİ)`)) {
    const cardsToDelete = rawCards.value.filter(c => c.category === category && c.lesson === selectedLesson.value)
    
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
  <!-- AUTH SCREEN (If not logged in) -->
  <div v-if="!user" class="auth-wrapper">
    <div class="auth-box glassy">
      <div class="logo-large">🧠 KPSS Kartları</div>
      
      <h3>{{ isRegisterMode ? 'Yeni Hesap Oluştur' : 'Giriş Yap' }}</h3>
      
      <form @submit.prevent="handleAuth">
        <input v-if="isRegisterMode" v-model="fullName" type="text" placeholder="Ad Soyad" required class="input-field" />
        <input v-model="email" type="email" placeholder="E-posta" required />
        <input v-model="password" type="password" placeholder="Şifre" required />
        
        <button type="submit" class="btn-primary full-width">
          {{ isRegisterMode ? 'Kaydol ve Başla' : 'Giriş Yap' }}
        </button>
      </form>

      <p class="auth-toggle" @click="isRegisterMode = !isRegisterMode">
        {{ isRegisterMode ? 'Zaten hesabın var mı? Giriş Yap' : 'Hesabın yok mu? Kaydol' }}
      </p>
    </div>
  </div>

  <!-- MAIN APP (If logged in) -->
  <div v-else class="app-container">
    <nav class="nav-bar glassy">
      <div class="logo">
        <span v-if="selectedLesson" class="back-arrow" @click="goHome">←</span>
        {{ selectedLesson ? selectedLesson : '🧠 KPSS Kartları' }}
      </div>
      <div class="auth-controls">
        <span class="user-email">{{ user.displayName || user.email }}</span>
        <button @click="handleLogout" class="btn-sm btn-logout">Çıkış Yap</button>
      </div>
    </nav>
    <!-- REMOVED OLD MODAL -->

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
                v-if="isAdmin"
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
            <button v-if="isAdmin" class="btn-primary" @click="mode = 'create'">+ Yeni Kart Ekle</button>
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

/* AUTH CONTROLS */
.auth-controls {
  position: absolute;
  right: 2rem;
  top: 50%;
  transform: translateY(-50%);
}

.icon-btn {
  font-size: 1.5rem;
  cursor: pointer;
  transition: transform 0.2s;
  display: block;
}

.icon-btn:hover {
  transform: scale(1.2);
}

/* MODAL */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}

.modal {
  background: #1a1a2e;
  padding: 2rem;
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
  text-align: center;
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
}

.modal h3 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: white;
}

.modal input {
  display: block;
  width: 100%;
  margin-bottom: 1rem;
  padding: 0.8rem;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.2);
  background: rgba(0,0,0,0.3);
  color: white;
}

.modal-actions {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 1rem;
}

.modal-actions button {
  flex: 1;
}

.auth-toggle {
  margin-top: 1rem;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  text-decoration: underline;
}

.auth-toggle:hover {
  color: white;
}

/* FULL SCREEN AUTH */
.auth-wrapper {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #1e1e2f 0%, #2a2a40 100%);
}

.auth-box {
  width: 90%;
  max-width: 400px;
  padding: 3rem 2rem;
  border-radius: 20px;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0,0,0,0.4);
}

.logo-large {
  font-size: 2rem;
  margin-bottom: 2rem;
  font-weight: bold;
  background: linear-gradient(to right, #4facfe 0%, #00f2fe 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.auth-box form input {
  display: block;
  width: 100%;
  padding: 1rem;
  margin-bottom: 1rem;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.05);
  color: white;
  font-size: 1rem;
}

.full-width {
  width: 100%;
  padding: 1rem;
  font-size: 1.1rem;
  margin-top: 1rem;
}

.user-email {
  font-size: 0.9rem;
  margin-right: 1rem;
  opacity: 0.7;
}

.logout-icon {
  display: inline-block;
}

.btn-logout {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.3);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.btn-logout:hover {
  background: rgba(239, 68, 68, 0.4);
  color: white;
}
</style>
