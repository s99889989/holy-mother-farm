<script setup>
const props = defineProps({
  modelValue: {type: String, default: ''},
  markedDates: {type: Array, default: () => []},
  theme: {type: String, default: 'green'}, // 'green' | 'orange'
  placeholder: {type: String, default: '選擇日期'}
})
const emit = defineEmits(['update:modelValue'])

const THEMES = {
  green: {
    selected: 'bg-green-700 text-white font-bold shadow-sm',
    today: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-semibold hover:bg-green-200',
    ring: 'ring-2 ring-green-400',
    text: 'text-green-700 dark:text-green-400 hover:text-green-800',
    dot: 'bg-red-500'
  },
  orange: {
    selected: 'bg-orange-600 text-white font-bold shadow-sm',
    today: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 font-semibold hover:bg-orange-200',
    ring: 'ring-2 ring-orange-400',
    text: 'text-orange-600 dark:text-orange-400 hover:text-orange-700',
    dot: 'bg-orange-400'
  }
}
const t = computed(() => THEMES[props.theme] || THEMES.green)

const open = ref(false)
const today = new Date()
const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

const parseYM = (dateStr) => {
  if (dateStr) {
    const [y, m] = dateStr.split('-')
    if (y && m) return {y: Number(y), m: Number(m)}
  }
  return {y: today.getFullYear(), m: today.getMonth() + 1}
}

const calYear = ref(parseYM(props.modelValue).y)
const calMonth = ref(parseYM(props.modelValue).m)

const calendarLabel = computed(() => `${calYear.value}年 ${calMonth.value}月`)

const calendarDays = computed(() => {
  const firstDay = new Date(calYear.value, calMonth.value - 1, 1).getDay()
  const daysInMonth = new Date(calYear.value, calMonth.value, 0).getDate()
  const days = []
  for (let i = 0; i < firstDay; i++) days.push({label: '', date: null})
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(calMonth.value).padStart(2, '0'), dd = String(d).padStart(2, '0')
    days.push({label: d, date: `${calYear.value}-${mm}-${dd}`})
  }
  return days
})

const dayClass = (day) => {
  if (!day.date) return 'cursor-default'
  if (day.date === props.modelValue) return t.value.selected
  if (day.date === todayStr) return t.value.today
  return 'text-base-c hover-surface2'
}

const prevMonth = () => {
  if (calMonth.value === 1) {
    calYear.value--
    calMonth.value = 12
  } else calMonth.value--
}
const nextMonth = () => {
  if (calMonth.value === 12) {
    calYear.value++
    calMonth.value = 1
  } else calMonth.value++
}

const toggle = () => {
  if (!open.value) {
    const ym = parseYM(props.modelValue)
    calYear.value = ym.y
    calMonth.value = ym.m
  }
  open.value = !open.value
}

const selectDay = (date) => {
  emit('update:modelValue', date)
  open.value = false
}
const clearDay = () => {
  emit('update:modelValue', '')
}
</script>

<template>
  <div class="relative">
    <button
      type="button"
      class="w-full flex items-center justify-between px-3 py-2 text-sm rounded-xl border border-light-c bg-surface text-base-c outline-none transition-shadow"
      :class="open ? t.ring : ''"
      @click="toggle"
    >
      <span :class="modelValue ? '' : 'text-hint-c'">{{ modelValue || placeholder }}</span>
      <svg
        class="w-4 h-4 text-hint-c flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    </button>

    <div
      v-if="open"
      class="fixed inset-0 z-40"
      @click="open = false"
    />

    <div
      v-if="open"
      class="absolute z-50 mt-2 w-72 max-w-[85vw] bg-surface rounded-2xl border border-light-c shadow-xl p-4 left-0"
    >
      <div class="flex items-center justify-between mb-3">
        <button
          type="button"
          class="p-1.5 hover-surface2 rounded-lg transition-colors"
          @click="prevMonth"
        >
          <svg
            class="w-5 h-5 text-hint-c dark:text-hint-c"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <span class="text-base font-semibold text-muted-c">{{ calendarLabel }}</span>
        <button
          type="button"
          class="p-1.5 hover-surface2 rounded-lg transition-colors"
          @click="nextMonth"
        >
          <svg
            class="w-5 h-5 text-hint-c dark:text-hint-c"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
      <div class="grid grid-cols-7 mb-1">
        <div
          v-for="w in ['日', '一', '二', '三', '四', '五', '六']"
          :key="w"
          class="text-center text-sm text-hint-c font-medium py-1"
        >
          {{ w }}
        </div>
      </div>
      <div class="grid grid-cols-7 gap-1">
        <div
          v-for="(day, idx) in calendarDays"
          :key="idx"
          class="relative flex flex-col items-center justify-center aspect-square rounded-xl text-sm cursor-pointer transition-all select-none"
          :class="dayClass(day)"
          @click="day.date && selectDay(day.date)"
        >
          <span>{{ day.label }}</span>
          <div
            v-if="day.date && markedDates.includes(day.date)"
            class="absolute bottom-1 flex gap-0.5"
          >
            <span
              class="w-1.5 h-1.5 rounded-full"
              :class="t.dot"
            />
          </div>
        </div>
      </div>
      <div class="flex items-center justify-between mt-3 pt-3 border-t border-light-c">
        <button
          type="button"
          class="text-sm text-hint-c hover:text-muted-c font-medium"
          @click="clearDay"
        >
          清除
        </button>
        <button
          type="button"
          class="text-sm font-medium"
          :class="t.text"
          @click="selectDay(todayStr)"
        >
          今天
        </button>
      </div>
    </div>
  </div>
</template>
