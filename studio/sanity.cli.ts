import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'spukl1fj',
    dataset: 'datasispertani',
  },
  // Hostname studio hasil deploy — https://sispertani.sanity.studio
  // (harus unik global; ganti bila sudah dipakai pihak lain)
  studioHost: 'sispertani',
  autoUpdates: true,
})
