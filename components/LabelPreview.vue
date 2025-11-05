<script setup>
import barcodeEAN13 from '@/assets/images/barcode/barcode-ean13.png'
import datamatrix from '@/assets/images/barcode/datamatrix.png'
import CzLogo from '@/assets/images/logos/cz-logo.png'
import EacLogo from '@/assets/images/logos/eac-logo.png'

const props = defineProps({
  schema: { type: Object, required: true },
  data: { type: Object, required: true }
})

function resolveTemplate(str) {
  if (!str) return ""
  return str.replace(/\{\{\s*([\w.]+)(?:\|([^}]*))?\s*\}\}/g, (_, key, fallback = "") => {
    const value = key.split(".").reduce((o, k) => (o ? o[k] : undefined), props.data)
    return value === undefined || value === null || value === "" ? fallback : value
  })
}

function resolveToSafeHtml(str) {
  if (!str) return ""

  // 1️⃣ подставим данные
  let html = resolveTemplate(str)

  // 2️⃣ заменим переносы строк на <br>
  html = html.replace(/\r?\n/g, "<br>")

  // 3️⃣ экранируем опасные символы
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")

  // 4️⃣ разрешим только нужные теги (<b>, </b>, <br>)
  html = html
    .replace(/&lt;b&gt;/g, "<b>")
    .replace(/&lt;\/b&gt;/g, "</b>")
    .replace(/&lt;br\s*\/?&gt;/gi, "<br>")

  return html
}
</script>

<template>
  <div
    class="label-box"
    :style="{
      width: props.schema.page.w + 'mm',
      height: props.schema.page.h + 'mm'
    }"
  >
    <div v-for="b in props.schema.blocks" :key="b.id"
         class="blk"
         :style="{
           position: 'absolute',
           left: b.x + 'mm',
           top: b.y + 'mm',
           width: b.w + 'mm',
           height: b.h + 'mm',
           fontSize: (b.style?.size || 2) + 'mm',
           textAlign: b.style?.align || 'left',
           fontWeight: b.style?.bold ? '700' : '400',
           fontStyle: b.style?.italic ? 'italic' : 'normal',
           textDecoration: b.style?.underline ? 'underline' : 'none'
         }"
    >
      <template v-if="b.type === 'text'">
        <div
          class="text-content"
          v-html="resolveToSafeHtml(b.text || '')"
          style="white-space: normal; word-break: break-word;"
        />
      </template>

      <template v-else-if="b.type === 'czLogo'">
        <img :src="CzLogo" style="max-width:100%;max-height:100%;object-fit:contain;" />
      </template>

      <template v-else-if="b.type === 'eacLogo'">
        <img :src="EacLogo" style="max-width:100%;max-height:100%;object-fit:contain;" />
      </template>

      <template v-else-if="b.type === 'barcode'">
        <img :src="barcodeEAN13" style="width:100%;height:80%;object-fit:contain;" />
      </template>

      <template v-else-if="b.type === 'datamatrix'">
        <img :src="datamatrix" style="width:100%;height:100%;object-fit:contain;" />
      </template>
    </div>          
  </div>
</template>
