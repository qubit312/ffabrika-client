<script setup>
import barcodeEAN13 from '@/assets/images/barcode/barcode-ean13.png'
import datamatrix from '@/assets/images/barcode/datamatrix.png'
import CzLogo from '@/assets/images/logos/cz-logo.png'

const props = defineProps({
  schema: { type: Object, required: true },
  data: { type: Object, required: true }
})

// простая подстановка {{field}}
function resolve(str) {
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => props.data[key] || "")
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
        {{ resolve(b.text || '') }}
      </template>

      <template v-else-if="b.type === 'czLogo'">
        <img :src="CzLogo" style="width:100%;height:100%;object-fit:contain;" />
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
