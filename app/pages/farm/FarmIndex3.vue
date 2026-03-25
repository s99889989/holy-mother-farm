<template>
  <div class="min-h-screen bg-[#FDFBF7] text-[#5A4B3F] font-sans selection:bg-green-100">

    <div class="absolute top-10 right-[10%] text-5xl animate-pulse">☀️</div>
    <div class="absolute top-24 left-[5%] opacity-40 text-4xl">☁️</div>

    <nav class="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-green-50 px-6 py-3 flex justify-between items-center shadow-sm">
      <div class="flex items-center gap-2">
        <div class="w-10 h-10 bg-[#8BC34A] rounded-full flex items-center justify-center text-white font-bold">康</div>
        <h1 class="text-xl font-bold tracking-tighter text-[#2D5A27]">康健生機 <small class="text-xs font-light block">O-HEALTH</small></h1>
      </div>
      <div class="hidden md:flex gap-8 font-medium text-sm">
        <a href="#" class="hover:text-green-600">最新消息</a>
        <a href="#" class="hover:text-green-600">品牌故事</a>
        <a href="#" class="hover:text-green-600">生機產品</a>
        <a href="#" class="hover:text-green-600">食農教育</a>
        <a href="#" class="hover:text-green-600">門市資訊</a>
      </div>
    </nav>

    <section class="relative pt-16 pb-24 text-center">
      <p class="text-red-400 font-bold mb-10 tracking-widest italic">讓自然的營養，成為您的健康來源</p>
      <div class="flex justify-center flex-wrap gap-6 px-4">
        <div v-for="(item, idx) in categories" :key="idx" class="group cursor-pointer">
          <div class="w-28 h-28 md:w-36 md:h-36 rounded-full border-4 border-[#E8F5E9] p-1 overflow-hidden transition-transform group-hover:scale-105 shadow-md">
            <img :src="item.img" class="w-full h-full object-cover rounded-full">
          </div>
          <p class="mt-4 font-bold text-green-800">{{ item.name }}</p>
        </div>
      </div>
    </section>

    <div class="relative bg-[#C8EAD1] pt-24 pb-32">
      <div class="absolute top-0 left-0 w-full overflow-hidden leading-[0] rotate-180">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" class="relative block w-full h-16 fill-[#FDFBF7]">
          <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V49.75C25,61.33,52.15,64.26,79,59.27c26.96-5,53.65-15,80.1-24.36C198.53,20.4,249,15,321.39,56.44Z"></path>
        </svg>
      </div>

      <div class="max-w-5xl mx-auto px-6">
        <div class="bg-white rounded-[60px] p-8 md:p-12 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center gap-10">
          <div class="absolute top-10 left-1/2 -translate-x-1/2 md:left-20 bg-yellow-300 px-6 py-1 -rotate-2 font-bold shadow-sm">最新消息</div>

          <div class="w-full md:w-1/2 relative group">
            <img src="https://picsum.photos/seed/farm1/600/450" class="rounded-3xl shadow-lg border-8 border-white group-hover:rotate-2 transition-transform">
          </div>
          <div class="w-full md:w-1/2">
            <h3 class="text-3xl font-bold text-green-900 mb-6">產地到餐桌的美味體驗</h3>
            <p class="leading-relaxed text-stone-600 mb-8">
              我們在土地與餐桌之間架起橋樑，堅持選用最無毒的食材，讓您的每一口都能感受到自然的脈動...
            </p>
            <button class="bg-[#4DB6AC] text-white px-10 py-3 rounded-full font-bold hover:shadow-lg transition-all active:scale-95">閱讀更多</button>
          </div>
        </div>
      </div>

      <div class="absolute bottom-0 left-0 w-full overflow-hidden leading-[0]">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" class="relative block w-full h-16 fill-[#FDFBF7]">
          <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V49.75C25,61.33,52.15,64.26,79,59.27c26.96-5,53.65-15,80.1-24.36C198.53,20.4,249,15,321.39,56.44Z"></path>
        </svg>
      </div>
    </div>

    <section class="py-24 max-w-6xl mx-auto px-6 text-center">
      <h2 class="text-2xl font-bold mb-12 flex items-center justify-center gap-4">
        <span class="w-12 h-[2px] bg-green-200"></span> 精選推薦 <span class="w-12 h-[2px] bg-green-200"></span>
      </h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
        <div v-for="n in 4" :key="n" class="bg-white p-4 rounded-3xl border border-stone-100 shadow-sm hover:shadow-md transition-shadow">
          <div class="aspect-square rounded-2xl overflow-hidden mb-4">
            <img :src="`https://picsum.photos/seed/p${n}/300`" class="w-full h-full object-cover">
          </div>
          <h4 class="font-bold text-stone-700">天然五穀餐盒</h4>
          <p class="text-xs text-stone-400 mt-1 uppercase tracking-tighter italic">O-Health Choice</p>
        </div>
      </div>
    </section>

    <footer class="bg-white border-t-4 border-double border-green-100 pt-16 pb-8">
      <div class="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-12 text-sm text-stone-500">
        <div class="flex flex-col items-center md:items-start gap-4">
          <img src="https://www.healthfarm.com.tw/images/logo.png" class="h-12 opacity-80" alt="Logo">
          <p>讓我們一起尋回食物最純粹的感動。</p>
        </div>
        <div class="space-y-2">
          <p class="font-bold text-stone-800">聯絡資訊</p>
          <p>地址：台中市XX區XX路123號</p>
          <p>電話：04-1234-5678</p>
        </div>
        <div class="flex justify-center md:justify-end gap-4">
          <div class="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center cursor-pointer">F</div>
          <div class="w-10 h-10 rounded-full bg-green-400 text-white flex items-center justify-center cursor-pointer">L</div>
        </div>
      </div>
      <div class="mt-12 text-center text-xs text-stone-400">
        © 2026 康健生機 Health Farm. All Rights Reserved.
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const categories = ref([
  { name: '關於我們', img: 'https://picsum.photos/seed/a/200' },
  { name: '有機蔬果', img: 'https://picsum.photos/seed/b/200' },
  { name: '生機食品', img: 'https://picsum.photos/seed/c/200' },
  { name: '食農課程', img: 'https://picsum.photos/seed/d/200' }
])
</script>

<style scoped>
/* 引用手寫感的中文字體能讓效果更好 */
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;500;700&display=swap');

:deep(body) {
  font-family: 'Noto Sans TC', sans-serif;
  background-color: #FDFBF7;
}

/* 輕微的漂浮動畫 */
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-15px); }
}

.animate-pulse {
  animation: float 4s ease-in-out infinite;
}
</style>
