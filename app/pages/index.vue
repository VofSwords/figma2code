<script setup lang="ts">
const solutionsQuery = useAsyncData(() =>
  queryCollection('solution').select('title', 'path', 'id').all(),
)

const resultsQuery = useAsyncData(() =>
  queryCollection('result').select('title', 'path', 'id').all(),
)

const [{ data: solutionsData }, { data: resultsData }] = await Promise.all([
  solutionsQuery,
  resultsQuery,
])

if (!solutionsData.value || !resultsData.value) {
  throw createError({
    statusCode: 500,
    statusMessage: 'Data loading failed',
  })
}

const solutions = solutionsData as Ref<typeof solutionsData.value>
const results = resultsData as Ref<typeof resultsData.value>

const resultsBySolutionPathMap = computed(() => {
  const map = new Map<string, typeof results.value>()

  if (results.value) {
    for (const result of results.value) {
      const solutionPath = getSolutionPathByResultPath(result.path)
      const list = map.get(solutionPath)

      if (!list) {
        map.set(solutionPath, [result])
      } else {
        list.push(result)
      }
    }
  }

  return map
})

const navigation = computed(() => {
  if (!solutions.value || !results.value) {
    return null
  }

  return solutions.value.map((solution) => {
    return {
      ...solution,
      results: resultsBySolutionPathMap.value.get(solution.path),
    }
  })
})
</script>

<template>
  <UContainer class="grow shrink-0 relative py-4 sm:py-6">
    <ProseH1>Figma2Code Solutions</ProseH1>
    <ProseUl>
      <ProseLi v-for="solution in navigation" :key="solution.path">
        <ProseA :href="solution.path">{{ solution.title }}</ProseA>
        <ProseUl v-if="solution.results && solution.results.length > 0">
          <ProseLi v-for="result in solution.results" :key="result.path">
            <ProseA :href="result.path">{{ result.title }}</ProseA>
          </ProseLi>
        </ProseUl>
      </ProseLi>
    </ProseUl>
  </UContainer>
</template>
