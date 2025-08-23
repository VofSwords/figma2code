<script setup lang="ts">
const route = useRoute()
const pagePath = removeTrailingSlash(route.path)

const { data } = await useAsyncData(pagePath, () => queryCollection('trial').path(pagePath).first())

if (!data.value) {
  throw showNotFoundError(route.path)
}

const page = data as Ref<typeof data.value>
const trialName = getTrialNameByPath(pagePath)

const resultsQuery = useAsyncData('results:' + pagePath, () =>
  queryCollection('result')
    .select('id', 'path', 'title')
    .where('path', 'LIKE', getResultPath('/%/' + trialName))
    .all(),
)
const solutionsQuery = useAsyncData('solutions:' + pagePath, () =>
  queryCollection('solution').select('id', 'path', 'title').all(),
)

const [{ data: results }, { data: solutions }] = await Promise.all([resultsQuery, solutionsQuery])
type Result = NonNullable<typeof results.value>[number]
type Soltuion = NonNullable<typeof solutions.value>[number]

const solutionsByPathMap = computed(() => {
  const map = new Map<string, Soltuion>()

  if (solutions.value) {
    for (const solution of solutions.value) {
      map.set(solution.path, solution)
    }
  }

  return map
})

const navigation = computed(() => {
  if (!results.value) {
    return []
  }

  const nav = [] as (Result & { solution: Soltuion })[]
  for (const result of results.value) {
    const solutionPath = getSolutionPathByResultPath(result.path)

    const solution = solutionsByPathMap.value.get(solutionPath)

    if (solution) {
      nav.push({
        ...result,
        solution,
      })
    }
  }

  return nav
})
</script>

<template>
  <UContainer class="grow shrink-0 relative py-4 sm:py-6">
    <ContentRenderer :value="page" />
    <ProseH2>Solutions</ProseH2>
    <ProseUl>
      <ProseLi v-for="result in navigation" :key="result.path">
        <ProseA :href="result.path">{{ result.solution.title }}: {{ result.title }}</ProseA>
      </ProseLi>
    </ProseUl>
  </UContainer>
</template>
