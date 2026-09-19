import {defineField, defineType} from 'sanity'

const SEKTOR_LIST = [
  {title: 'Tanaman Pangan', value: 'Tanaman Pangan'},
  {title: 'Hortikultura', value: 'Hortikultura'},
  {title: 'Perkebunan', value: 'Perkebunan'},
  {title: 'Peternakan', value: 'Peternakan'},
  {title: 'Perikanan', value: 'Perikanan'},
  {title: 'Lainnya', value: 'Lainnya'},
]

const PENERIMA_LIST = [
  {title: 'Kelompok Tani', value: 'Kelompok Tani'},
  {title: 'Gapoktan', value: 'Gapoktan'},
  {title: 'Koperasi', value: 'Koperasi'},
  {title: 'Kelompok Ternak', value: 'Kelompok Ternak'},
  {title: 'Pembudidaya / Nelayan', value: 'Pembudidaya / Nelayan'},
  {title: 'Lainnya', value: 'Lainnya'},
]

/** 3200000000 → "Rp 3,2 Miliar" (untuk preview subtitle Studio) */
function rupiahShort(n: number | undefined): string {
  const v = typeof n === 'number' && isFinite(n) ? n : 0
  if (v >= 1e12) return `Rp ${(v / 1e12).toLocaleString('id-ID', {maximumFractionDigits: 1})} T`
  if (v >= 1e9) return `Rp ${(v / 1e9).toLocaleString('id-ID', {maximumFractionDigits: 1})} Miliar`
  if (v >= 1e6) return `Rp ${(v / 1e6).toLocaleString('id-ID', {maximumFractionDigits: 0})} Juta`
  return `Rp ${v.toLocaleString('id-ID')}`
}

export const programBantuan = defineType({
  name: 'programBantuan',
  title: 'Program Bantuan',
  type: 'document',
  fields: [
    defineField({
      name: 'nama',
      title: 'Nama Program Kerja',
      type: 'string',
      description: 'Contoh: Bantuan Alat Mesin Pertanian (Combine Harvester & Traktor)',
      validation: (r) => r.required().max(200),
    }),
    defineField({
      name: 'sumber',
      title: 'Sumber Dana',
      type: 'string',
      options: {
        list: [
          {title: 'APBN — Anggaran Pusat', value: 'APBN'},
          {title: 'APBD — Anggaran Kabupaten', value: 'APBD'},
        ],
        layout: 'radio',
      },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'tahunAnggaran',
      title: 'Tahun Anggaran',
      type: 'number',
      validation: (r) => r.required().min(2000).max(2100),
    }),
    defineField({
      name: 'nilaiRupiah',
      title: 'Nilai Anggaran (Rupiah)',
      type: 'number',
      description: 'Masukkan angka Rupiah PENUH tanpa titik — contoh: 3200000000 = Rp 3,2 Miliar',
      validation: (r) => r.required().min(0),
    }),
    defineField({
      name: 'sektor',
      title: 'Sektor Target',
      type: 'string',
      options: {list: SEKTOR_LIST},
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'penerimaJumlah',
      title: 'Jumlah Penerima (kelompok/petani)',
      type: 'number',
      validation: (r) => r.min(0).max(100000),
    }),
    defineField({
      name: 'penerimaJenis',
      title: 'Jenis Penerima',
      type: 'string',
      options: {list: PENERIMA_LIST},
    }),
    defineField({
      name: 'dampakLevel',
      title: 'Level Dampak',
      type: 'string',
      options: {
        list: [
          {title: 'Tinggi', value: 'Tinggi'},
          {title: 'Sedang', value: 'Sedang'},
          {title: 'Rendah', value: 'Rendah'},
        ],
        layout: 'radio',
      },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'dampakCatatan',
      title: 'Catatan Dampak',
      type: 'text',
      rows: 3,
      description: 'Contoh: +15% efisiensi waktu panen; 0% penularan PMK baru',
    }),
  ],
  preview: {
    select: {title: 'nama', sumber: 'sumber', tahun: 'tahunAnggaran', nilai: 'nilaiRupiah', level: 'dampakLevel'},
    prepare({title, sumber, tahun, nilai, level}) {
      return {
        title: title || 'Program tanpa nama',
        subtitle: `${sumber || ''} ${tahun || ''} — ${rupiahShort(nilai as number | undefined)} — Dampak ${level || '-'}`,
      }
    },
  },
})

export const alokasiTahunan = defineType({
  name: 'alokasiTahunan',
  title: 'Alokasi Anggaran Tahunan',
  type: 'document',
  fields: [
    defineField({
      name: 'tahun',
      title: 'Tahun',
      type: 'number',
      validation: (r) => r.required().min(2000).max(2100),
    }),
    defineField({
      name: 'apbdMiliar',
      title: 'APBD (Miliar Rp)',
      type: 'number',
      description: 'Dalam Miliar Rupiah — contoh: 4,8',
      validation: (r) => r.required().min(0),
    }),
    defineField({
      name: 'apbnMiliar',
      title: 'APBN (Miliar Rp)',
      type: 'number',
      description: 'Dalam Miliar Rupiah — contoh: 8,7',
      validation: (r) => r.required().min(0),
    }),
  ],
  preview: {
    select: {tahun: 'tahun', apbd: 'apbdMiliar', apbn: 'apbnMiliar'},
    prepare({tahun, apbd, apbn}) {
      return {
        title: `Tahun ${tahun || '-'}`,
        subtitle: `APBD ${apbd ?? 0} M — APBN ${apbn ?? 0} M — Total ${(Number(apbd) || 0) + (Number(apbn) || 0)} Miliar`,
      }
    },
  },
})

export const korelasiSektor = defineType({
  name: 'korelasiSektor',
  title: 'Korelasi Bantuan per Sektor',
  type: 'document',
  fields: [
    defineField({
      name: 'sektor',
      title: 'Sektor',
      type: 'string',
      options: {list: SEKTOR_LIST},
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'bantuanMiliar',
      title: 'Total Bantuan Sektor (Miliar Rp)',
      type: 'number',
      description: 'Dalam Miliar Rupiah — contoh: 5,2',
      validation: (r) => r.required().min(0),
    }),
    defineField({
      name: 'kenaikanProduksiPct',
      title: 'Kenaikan Produksi (%)',
      type: 'number',
      description: 'Persentase laju kenaikan produksi sektor — contoh: 14,2',
      validation: (r) => r.required(),
    }),
  ],
  preview: {
    select: {sektor: 'sektor', bantuan: 'bantuanMiliar', kenaikan: 'kenaikanProduksiPct'},
    prepare({sektor, bantuan, kenaikan}) {
      return {
        title: sektor || 'Sektor',
        subtitle: `Bantuan ${bantuan ?? 0} Miliar — Kenaikan produksi ${kenaikan ?? 0}%`,
      }
    },
  },
})

export const schemaTypes = [programBantuan, alokasiTahunan, korelasiSektor]
