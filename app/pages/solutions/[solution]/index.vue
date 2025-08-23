<script setup lang="ts">
const route = useRoute()
const pagePath = removeTrailingSlash(route.path)

const { data } = await useAsyncData(pagePath, () =>
  queryCollection('solution').path(pagePath).first(),
)

if (!data.value) {
  throw showNotFoundError(route.path)
}

const page = data as Ref<typeof data.value>

const { data: results } = await useAsyncData('results:' + pagePath, () =>
  queryCollection('result')
    .where('path', 'LIKE', page.value.path + '/%')
    .select('id', 'path', 'title')
    .all(),
)
</script>

<template>
  <UContainer class="grow shrink-0 relative py-4 sm:py-6">
    <ContentRenderer :value="page" />
    <ProseH2>Trials</ProseH2>
    <ProseUl>
      <ProseLi v-for="result in results" :key="result.id">
        <ProseA :href="result.path">{{ result.title }}</ProseA>
      </ProseLi>
    </ProseUl>
  </UContainer>
</template>
