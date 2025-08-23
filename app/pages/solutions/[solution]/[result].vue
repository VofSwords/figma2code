<script setup lang="ts">
import { queryHtmlResult } from '~/lib/result-html'

const route = useRoute()

const pagePath = removeTrailingSlash(route.path)

const solutionPath = getSolutionPathByResultPath(pagePath)
const trialPath = getTrialPath(getTrialNameByPath(pagePath))

const resultQuery = useAsyncData(pagePath, () => queryCollection('result').path(pagePath).first())

const solutionQuery = useAsyncData('solution:' + pagePath, () =>
  queryCollection('solution').path(solutionPath).select('title', 'path').first(),
)
const trialQuery = useAsyncData('trial:' + pagePath, () =>
  queryCollection('trial').path(trialPath).select('title', 'path').first(),
)
const htmlQuery = useAsyncData('html:' + pagePath, () => queryHtmlResult(pagePath))

const [resultData, solutionData, trialData, htmlData] = await Promise.all([
  resultQuery,
  solutionQuery,
  trialQuery,
  htmlQuery,
])

if (!resultData.data.value || !solutionData.data.value || !htmlData.data.value) {
  throw showNotFoundError(route.path)
}

const result = resultData.data as Ref<typeof resultData.data.value>
const solution = solutionData.data as Ref<typeof solutionData.data.value>
const html = htmlData.data as Ref<typeof htmlData.data.value>
const trial = trialData.data
</script>

<template>
  <UContainer class="grow shrink-0 relative py-4 sm:py-6">
    <ProseH1>{{ result.title }}</ProseH1>
    <ProseH2>
      Solution: <ProseA :href="solution.path">{{ solution.title }}</ProseA>
    </ProseH2>
    <ProseH2>
      Trial:
      <ProseA v-if="trial" :href="trial.path">{{ trial.title }}</ProseA>
      <ProseEm v-else>Not found</ProseEm>
    </ProseH2>

    <object :data="html">
      Your browser does not support embedding this content.<br />
      {{ html }}
    </object>
  </UContainer>
</template>
