import { computed, ref, watch, type Ref } from 'vue'

interface ClassOption {
  value: string
  label: string
  unite_num: string
  first_num?: string
  second_num?: string
  third_num?: string
}

interface ClassData {
  firstClass?: ClassOption[]
  secondClass?: ClassOption[]
  thirdClass?: ClassOption[]
  fourthClass?: ClassOption[]
}

export function useInternalSystemPropertyClassCascade(classData: Ref<ClassData | null>) {
  const first = ref('')
  const second = ref('')
  const third = ref('')
  const fourth = ref('')

  const firstOptions = computed(() => classData.value?.firstClass ?? [])

  const secondOptions = computed(() =>
    (classData.value?.secondClass ?? []).filter((o) => o.first_num === first.value)
  )

  const thirdOptions = computed(() =>
    (classData.value?.thirdClass ?? []).filter(
      (o) => o.first_num === first.value && o.second_num === second.value
    )
  )

  const fourthOptions = computed(() =>
    (classData.value?.fourthClass ?? []).filter(
      (o) => o.first_num === first.value && o.second_num === second.value && o.third_num === third.value
    )
  )

  watch(first, () => {
    second.value = ''
    third.value = ''
    fourth.value = ''
  })
  watch(second, () => {
    third.value = ''
    fourth.value = ''
  })
  watch(third, () => {
    fourth.value = ''
  })

  return { first, second, third, fourth, firstOptions, secondOptions, thirdOptions, fourthOptions }
}