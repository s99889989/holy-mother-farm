<template>
  <div>
    <SitePageHero cover="/images/cafe/cafe-cover.png" title="休憩小舖" />

    <div class="max-w-4xl mx-auto px-4 py-8">
      <div class="text-center mb-4">
        <h2 class="text-lg font-bold" style="color: #5bbfbf;">休憩小舖</h2>
      </div>
      <div class="rounded-2xl border-2 border-dashed p-6 sm:p-8 bg-white" style="border-color: #b8d8d0;">

        <div class="flex flex-col sm:flex-row gap-6 mb-8">
          <p class="text-sm text-gray-600 leading-relaxed flex-1">
            聖母健康農莊設立的「休憩小舖」，即是因應「中華民國家庭照顧者關懷總會」（簡稱「家總」）而產生的，家主要是以提供給照顧者成員，一個能分享彼此生命故事以及給予情緒、靈性支持與喘息場所，也就是「家庭照顧者咖啡館」。
          </p>
          <img src="/images/cafe/cafe-photo1.png" alt="休憩小舖" class="w-full sm:w-48 rounded-2xl object-cover" />
        </div>

        <p class="text-sm text-gray-600 leading-relaxed mb-8">
          期待由一杯咖啡開始，能喚起大眾對於「家庭照顧者」這個角色的關注，協助家庭照顧者減輕照顧身者、心以及來自社會等層面的負荷，藉以得到平衡點。
        </p>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <img src="/images/cafe/cafe-photo2.jpg" alt="休憩小舖" class="rounded-2xl w-full object-cover aspect-video" />
          <img src="/images/cafe/cafe-photo3.jpg" alt="休憩小舖" class="rounded-2xl w-full object-cover aspect-video" />
        </div>

        <p class="text-sm text-gray-600 leading-relaxed mb-8">
          家庭照顧者所面臨能力及個人資源上的缺乏，不只是讓照顧者單獨面對被照顧者，往往在生活上亦呈以被照顧者為生活的重心，長其自長期的照顧過程中，容易被照顧者的角色所消蝕，甚至於步步入孤立與孤獨、封閉自我的困境中；沒有人應訴因為照顧而筋疲，我們努力推動這種的認知，幫助家庭照顧者重新看見自己。
        </p>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <img src="/images/cafe/cafe-photo4.jpg" alt="休憩小舖" class="rounded-2xl w-full object-cover aspect-video" />
          <img src="/images/cafe/cafe-photo5.jpg" alt="休憩小舖" class="rounded-2xl w-full object-cover aspect-video" />
        </div>

        <p class="text-sm text-gray-600 leading-relaxed mb-8">
          基於此，聖母健康農莊「休憩小舖」除了提供照顧者一個能暫時抽離照顧壓力的休憩場所，更希望打造成社區性的「長照資訊站」，除了讓照顧者能到咖啡館放鬆喝杯咖啡的喘息外，家庭照顧者留下的聯絡方式，社工、醫護人員就能持續追蹤這個長照家庭的狀況，藉由彼此的資訊分享及心情交流，讓照顧者知道，在家庭照顧這條路上，我们並不孤單。
        </p>

        <div class="flex flex-col sm:flex-row gap-6 items-center">
          <img src="/images/cafe/cafe-photo6.jpg" alt="休憩小舖" class="w-full sm:w-48 rounded-2xl object-cover" />
          <p class="text-sm text-gray-600 leading-relaxed flex-1">
            另外，未來我們也將提供給於任或的家庭照顧者在「照顧者咖啡館」實習的機會，除了學習的引導、點餐、客人互動到學習內場餐點、飲品製作，逐漸後練人群，期間未來，順利接、融入社會。<br><br>
            當你愛著自己，宇宙也深深擁抱著你，就從一杯咖啡開始，勇敢走出，就有希望，迎接更好的明天、更好的自己。
          </p>
        </div>

      </div>
    </div>

    <div class="text-center pb-12">
      <NuxtLink to="/site" class="inline-block px-8 py-3 rounded-full text-sm font-medium text-white" style="background-color: #5bbfbf;">
        回聖母健康農莊首頁
      </NuxtLink>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'site' })
</script>
