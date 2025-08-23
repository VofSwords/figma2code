import { defineContentConfig, defineCollection } from '@nuxt/content'
import { removeLeadingSlash } from './shared/utils/path'
import { getResultPath, getSolutionPath, getTrialPath } from './shared/utils/collections'
import { resolve } from 'pathe'

const solutionsSource = removeLeadingSlash(getSolutionPath('/*/index.md'))
const resultsSource = removeLeadingSlash(getResultPath('/*/*.md'))
const trialSource = removeLeadingSlash(getTrialPath('/*.md'))

export default defineContentConfig({
  collections: {
    solution: defineCollection({
      type: 'page',
      source: {
        include: solutionsSource,
        cwd: resolve('./app/content'),
      },
    }),
    result: defineCollection({
      type: 'page',
      source: {
        include: resultsSource,
        exclude: [solutionsSource],
        cwd: resolve('./app/content'),
      },
    }),
    trial: defineCollection({
      type: 'page',
      source: {
        include: trialSource,
        cwd: resolve('./app/content'),
      },
    }),
  },
})
