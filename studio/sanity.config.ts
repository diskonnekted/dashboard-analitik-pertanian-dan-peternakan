import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemas'

export default defineConfig({
  name: 'default',
  title: 'SISPERTANI — Data Bantuan Pemerintah',
  projectId: 'spukl1fj',
  dataset: 'datasispertani',
  plugins: [structureTool(), visionTool()],
  schema: {
    types: schemaTypes,
  },
})
