<template>
  <VCard flat class="ld-panel pa-3">
    <VRow>
      <VCol cols="4">
        <VCardTitle class="text-subtitle-1 mb-1">Параметры холста</VCardTitle>

        <VRow dense>
          <VCol cols="6">
            <AppTextField v-model.number="canvas.w" type="number" step="0.5" label="Ширина" suffix="мм"
              @input="applyCanvas()" />
          </VCol>
          <VCol cols="6">
            <AppTextField v-model.number="canvas.h" type="number" step="0.5" label="Высота" suffix="мм"
              @input="applyCanvas()" />
          </VCol>

          <VCol cols="8">
            <AppTextField v-model.number="canvas.grid" type="number" step="0.5" label="Сетка" suffix="мм"
              @input="applyCanvas()" />
          </VCol>
          <VCol cols="4" class="d-flex align-center">
            <VSwitch class="mt-6 ms-4" v-model="canvas.snap" inset color="primary" label="Снап"/>
          </VCol>
          <VRow>
          <VCol>
            <VSlider v-model="zoom" :min="0.5" :max="2" :step="0.1" label="Zoom"/>
          </VCol>
        </VRow>
        </VRow>

        <VDivider class="mt-6" />

        <VCardTitle class="text-subtitle-1 mb-1 mt-2">Выбранный блок</VCardTitle>

        <VRow dense>
          <VCol cols="12">
            <AppSelect v-model="selectedType"
              :items="[{ title: 'Текст', value: 'text' }, { title: 'Изображение', value: 'image' }, 
              { title: 'Штрихкод', value: 'barcode' }, { title: 'ЧЗ', value: 'datamatrix' }, ]" label="Тип блока"
              @update:model-value="changeType" />
          </VCol>

          <VCol cols="6">
            <AppTextField :model-value="sel?.x ?? null" @update:model-value="v => updateSel('x', v)" type="number"
              step="0.5" label="x" suffix="мм" />
          </VCol>

          <VCol cols="6">
            <AppTextField :model-value="sel?.y ?? null" @update:model-value="v => updateSel('y', v)" type="number"
              step="0.5" label="y" suffix="мм" />
          </VCol>

          <VCol cols="6">
            <AppTextField :model-value="sel?.w ?? null" @update:model-value="v => updateSel('w', v)" type="number"
              step="0.5" label="w" suffix="мм" />
          </VCol>
          <VCol cols="6">
            <AppTextField :model-value="sel?.h ?? null" @update:model-value="v => updateSel('h', v)" type="number"
              step="0.5" label="h" suffix="мм" />
          </VCol>

          <VCol cols="12">
            <AppTextField :model-value="textOrSrc" @update:model-value="updateTextOrSrc" label="Текст / URL изображения"
              placeholder="Введите текст блока или URL" />
          </VCol>
        </VRow>

        <!-- Доп. стили текста -->
        <template v-if="sel?.type === 'text'">
          <VDivider class="mt-6" />
          <VCardTitle class="text-subtitle-1 mb-1 mt-2">Текст: стиль</VCardTitle>
          <VRow dense>
            <VCol cols="6">
              <AppTextField :model-value="sel?.style?.size ?? 3" @update:model-value="v => updateStyle('size', v)"
                type="number" step="0.1" label="Кегль" suffix="мм" />
            </VCol>
            <VCol cols="6">
              <AppSelect :model-value="sel?.style?.bold ? '1' : '0'" @update:model-value="v => updateStyle('bold', v)"
                :items="[{ title: 'Нет', value: '0' }, { title: 'Да', value: '1' }]" label="Жирный" />
            </VCol>
            <VCol cols="12">
              <AppSelect :model-value="sel?.style?.align ?? 'left'" @update:model-value="v => updateStyle('align', v)"
                :items="[
                  { title: 'Слева', value: 'left' },
                  { title: 'Центр', value: 'center' },
                  { title: 'Справа', value: 'right' }
                ]" label="Выравнивание" />
            </VCol>
          </VRow>
        </template>

        <VRow class="mt-1">
          <VCol cols="12" class="d-flex ga-2 flex-wrap">
            <VBtn variant="outlined" @click="addText">+ Текст</VBtn>
            <VBtn variant="outlined" @click="addImage">+ Картинка</VBtn>
            <VBtn color="error" variant="flat" :disabled="!selectedId" @click="removeSel">Удалить
            </VBtn>
          </VCol>
        </VRow>

        <VDivider class="mt-6" />

        <!---->
        <VCardTitle class="text-subtitle-1 pb-1">JSON схема</VCardTitle>
        <VTextarea v-model="schema" auto-grow rows="8" variant="outlined" density="compact" class="mb-2" /> 
        <div class="d-flex ga-2">
          <VBtn color="primary" @click="copySchema">Экспорт</VBtn>
          <VBtn variant="outlined" @click="importSchema">Импорт</VBtn>
        </div>
        
        
      </VCol>
      <VCol cols="8" class="d-flex justify-center" style="min-height: 60vh">
        <div class="workspace">
          <div class="canvas-wrap" style="position: relative;">
            <div class="ruler-x" id="rulerX"></div>
            <div class="ruler-y" id="rulerY"></div>
            <div class="canvas-wrapper">
              <div class="canvas" id="canvas" style="position:relative; background:#fff; border:1px solid #ddd;"></div>
            </div>
          </div>
        </div>
      </VCol>
    </VRow>
  </VCard>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';

// === utils ===
const mm = (v: number) => `${v}mm`
const roundTo = (v: number, step: number) => Math.round(v / step) * step

// === reactive state ===
type TextBlock = {
  id: string; type: 'text'; x: number; y: number; w: number; h: number;
  text: string; style?: { size?: number; bold?: boolean; align?: 'left' | 'center' | 'right' }
}
type ImageBlock = {
  id: string; type: 'image'; x: number; y: number; w: number; h: number; src: string
}
type Block = TextBlock | ImageBlock

const canvas = reactive({ w: 58, h: 40, pad: 1, grid: 0.5, snap: true })
const blocks = reactive<Block[]>([
  { id: 't1', type: 'text', x: 1, y: 1, w: 32, h: 9, text: 'Платье женское', style: { bold: true, align: 'left', size: 3 } },
  { id: 't2', type: 'text', x: 1, y: 10.5, w: 32, h: 14, text: 'Размер: S\nЦвет: Розовый\nСостав: 95% хлопок, 5% полиэстер', style: { size: 3 } },
  { id: 'img1', type: 'image', x: 35, y: 1, w: 22, h: 19, src: 'https://via.placeholder.com/200x200?text=QR' },
  { id: 't3', type: 'text', x: 35, y: 21, w: 22, h: 6, text: '12321891237812323\n123218912378123', style: { size: 2.6 } },
  { id: 't4', type: 'text', x: 35, y: 28, w: 22, h: 11, text: 'Title', style: { size: 3, align: 'center' } },
])
const selectedId = ref<string | null>(null)
const schema = ref('')

// DOM refs (через id, как у тебя в шаблоне)
const el = {
  canvas: null as HTMLDivElement | null,
  rulerX: null as HTMLDivElement | null,
  rulerY: null as HTMLDivElement | null,
}

// === computed ===
const sel = computed(() => blocks.find(b => b.id === selectedId.value))
const selectedType = computed({
  get: () => sel.value?.type ?? 'text',
  set: () => { }
})
const textOrSrc = computed(() => {
  if (!sel.value) return ''
  return sel.value.type === 'text' ? sel.value.text : sel.value.src
})

// === lifecycle ===
onMounted(() => {
  el.canvas = document.getElementById('canvas') as HTMLDivElement
  el.rulerX = document.getElementById('rulerX') as HTMLDivElement
  el.rulerY = document.getElementById('rulerY') as HTMLDivElement
  applyCanvas() // первый рендер
})

// === methods used by template ===
function applyCanvas() {
  applyCanvasSize()
  renderRulers()
  renderBlocks()
  syncSchema()
}

function changeType(val: 'text' | 'image') {
  if (!sel.value) return
  if (sel.value.type === val) return
  const i = blocks.findIndex(b => b.id === sel.value!.id)
  if (i < 0) return
  if (val === 'text') {
    const nb: TextBlock = { id: sel.value.id, type: 'text', x: sel.value.x, y: sel.value.y, w: sel.value.w, h: sel.value.h, text: 'Новый текст', style: { size: 3 } }
    blocks.splice(i, 1, nb)
  } else {
    const nb: ImageBlock = { id: sel.value.id, type: 'image', x: sel.value.x, y: sel.value.y, w: sel.value.w, h: sel.value.h, src: '' }
    blocks.splice(i, 1, nb)
  }
  renderBlocks(); syncSchema()
}

function updateSel(key: 'x' | 'y' | 'w' | 'h', val: any) {
  if (!sel.value) return
  const num = Number(val)
  if (!Number.isFinite(num)) return
    ; (sel.value as any)[key] = num
  clampBlock(sel.value)
  renderBlocks(); syncSchema()
}

function updateTextOrSrc(val: string) {
  if (!sel.value) return
  if (sel.value.type === 'text') (sel.value as TextBlock).text = val ?? ''
  else (sel.value as ImageBlock).src = val ?? ''
  renderBlocks(); syncSchema()
}

function updateStyle(key: 'size' | 'bold' | 'align', val: any) {
  if (!sel.value || sel.value.type !== 'text') return
  sel.value.style ||= {}
  if (key === 'bold') sel.value.style.bold = String(val) === '1'
  else if (key === 'size') sel.value.style.size = Number(val)
  else sel.value.style.align = val
  renderBlocks(); syncSchema()
}

function addText() {
  const id = 't' + Math.random().toString(36).slice(2, 7)
  blocks.push({ id, type: 'text', x: 2, y: 2, w: 20, h: 6, text: 'Новый текст', style: { size: 3 } })
  selectedId.value = id
  renderBlocks(); syncSchema()
}
function addImage() {
  const id = 'img' + Math.random().toString(36).slice(2, 7)
  blocks.push({ id, type: 'image', x: 4, y: 4, w: 16, h: 12, src: 'https://via.placeholder.com/160x120?text=IMG' })
  selectedId.value = id
  renderBlocks(); syncSchema()
}
function removeSel() {
  if (!selectedId.value) return
  const i = blocks.findIndex(b => b.id === selectedId.value)
  if (i >= 0) blocks.splice(i, 1)
  selectedId.value = null
  renderBlocks(); syncSchema()
}

async function copySchema() {
  try { await navigator.clipboard.writeText(schema.value) } catch { }
}
function importSchema() {
  try {
    const obj = JSON.parse(schema.value)
    if (obj.page) Object.assign(canvas, obj.page)
    if (Array.isArray(obj.blocks)) {
      blocks.splice(0, blocks.length, ...obj.blocks)
    }
    applyCanvas()
  } catch { alert('Неверный JSON') }
}

// === renderers (канвас/линейки/блоки) ===
function applyCanvasSize() {
  if (!el.canvas || !el.rulerX || !el.rulerY) return
  el.canvas.style.width = mm(canvas.w)
  el.canvas.style.height = mm(canvas.h)
  el.canvas.style.padding = mm(canvas.pad)
  el.canvas.style.backgroundSize = `${mm(canvas.grid)} ${mm(canvas.grid)}, ${mm(canvas.grid)} ${mm(canvas.grid)}`
  el.rulerX.style.width = mm(canvas.w)
  el.rulerY.style.height = mm(canvas.h)
}

function renderRulers() {
  if (!el.rulerX || !el.rulerY) return
  const rx = el.rulerX, ry = el.rulerY
  rx.innerHTML = ''; ry.innerHTML = ''

  for (let i = 0; i <= canvas.w; i++) {
    const t = document.createElement('div')
    t.className = 'tick'
    t.style.position = 'absolute'
    t.style.left = mm(i)
    t.style.width = (i % 10 === 0) ? '2px' : '1px'
    t.style.top = '0'; t.style.bottom = '0'; t.style.background = '#e5e7eb'
    rx.appendChild(t)
    if (i % 10 === 0) {
      const label = document.createElement('div')
      label.style.position = 'absolute'
      label.style.left = mm(i + 0.5)
      label.style.top = '2px'
      label.textContent = String(i)
      rx.appendChild(label)
    }
  }
  for (let i = 0; i <= canvas.h; i++) {
    const t = document.createElement('div')
    t.className = 'tick'
    t.style.position = 'absolute'
    t.style.top = mm(i)
    t.style.height = (i % 10 === 0) ? '2px' : '1px'
    t.style.left = '0'; t.style.right = '0'; t.style.background = '#e5e7eb'
    ry.appendChild(t)
    if (i % 10 === 0) {
      const label = document.createElement('div')
      label.style.position = 'absolute'
      label.style.top = mm(i + 0.5)
      label.style.left = '2px'
      label.textContent = String(i)
      ry.appendChild(label)
    }
  }
}

function renderBlocks() {
  if (!el.canvas) return
  el.canvas.innerHTML = ''
  for (const b of blocks) {
    const d = document.createElement('div')
    d.className = 'block'
    d.dataset.id = b.id
    d.dataset.type = b.type
    d.dataset.selected = (b.id === selectedId.value) ? 'true' : 'false'
    d.style.left = mm(b.x)
    d.style.top = mm(b.y)
    d.style.width = mm(b.w)
    d.style.height = mm(b.h)
    d.style.position = 'absolute'

    // const badge = document.createElement('div')
    // badge.className = 'badge'
    // badge.textContent = `${b.x}×${b.y} / ${b.w}×${b.h} мм`
    // d.appendChild(badge)

    if (b.type === 'text') {
      const c = document.createElement('div')
      c.className = 'content'
      c.contentEditable = 'true'
      c.style.width = '100%'; c.style.height = '100%'
      c.style.fontSize = mm((b as TextBlock).style?.size ?? 3)
      c.style.fontWeight = ((b as TextBlock).style?.bold ? '700' : '400')
      c.style.textAlign = ((b as TextBlock).style?.align ?? 'left')
      c.style.whiteSpace = 'pre-wrap'
      c.style.overflow = 'hidden'
      c.textContent = (b as TextBlock).text ?? ''
      c.addEventListener('input', () => { (b as TextBlock).text = c.textContent || ''; syncSchema() })
      d.appendChild(c)
    } else {
      const i = document.createElement('img');
      i.src = (b as ImageBlock).src || '';
      i.alt = '';
      i.draggable = false;                     // <— важно
      i.addEventListener('dragstart', e => e.preventDefault());  // страховка
      i.style.width='100%';
      i.style.height='100%';
      i.style.objectFit='contain';
      d.appendChild(i);
    }

    const resize = document.createElement('div')
    resize.className = 'resize'
    d.appendChild(resize)

    addDragHandlers(d, b)
    addResizeHandlers(d, b, resize)

    d.addEventListener('pointerdown', () => {
      selectedId.value = b.id
      renderBlocks(); syncSchema()
    })

    el.canvas.appendChild(d)
  }
}

function clampBlock(b: Block) {
  b.x = Math.max(0, Math.min(b.x, canvas.w - b.w))
  b.y = Math.max(0, Math.min(b.y, canvas.h - b.h))
}

// === DnD / resize ===
let drag: null | { startX: number; startY: number; bx: number; by: number; b: Block } = null
function addDragHandlers(node: HTMLElement, b: Block) {
  node.addEventListener('pointerdown', (e: PointerEvent) => {
    if ((e.target as HTMLElement).classList.contains('resize')) return
    node.setPointerCapture(e.pointerId)
    const rect = el.canvas!.getBoundingClientRect()
    drag = {
      startX: e.clientX - rect.left,
      startY: e.clientY - rect.top,
      bx: b.x, by: b.y, b
    }
  })
  node.addEventListener('pointermove', (e: PointerEvent) => {
    if (!drag) return
    const rect = el.canvas!.getBoundingClientRect()
    const k = canvas.w / rect.width // мм/px
    let nx = drag.bx + (e.clientX - rect.left - drag.startX) * k
    let ny = drag.by + (e.clientY - rect.top - drag.startY) * k
    if (canvas.snap) { nx = roundTo(nx, canvas.grid); ny = roundTo(ny, canvas.grid) }
    nx = Math.max(0, Math.min(nx, canvas.w - b.w))
    ny = Math.max(0, Math.min(ny, canvas.h - b.h))
    b.x = +nx.toFixed(2); b.y = +ny.toFixed(2)
    renderBlocks(); syncSchema()
  })
  node.addEventListener('pointerup', () => { drag = null })
  node.addEventListener('pointercancel', () => { drag = null })
}

let rez: null | { startX: number; startY: number; bw: number; bh: number; b: Block } = null
function addResizeHandlers(node: HTMLElement, b: Block, handle: HTMLElement) {
  handle.addEventListener('pointerdown', (e: PointerEvent) => {
    node.setPointerCapture(e.pointerId)
    const rect = el.canvas!.getBoundingClientRect()
    rez = { startX: e.clientX - rect.left, startY: e.clientY - rect.top, bw: b.w, bh: b.h, b }
    e.stopPropagation()
  })
  node.addEventListener('pointermove', (e: PointerEvent) => {
    if (!rez) return
    const rect = el.canvas!.getBoundingClientRect()
    const k = canvas.w / rect.width
    let nw = rez.bw + (e.clientX - rect.left - rez.startX) * k
    let nh = rez.bh + (e.clientY - rect.top - rez.startY) * k
    nw = Math.max(2, Math.min(nw, canvas.w - b.x))
    nh = Math.max(2, Math.min(nh, canvas.h - b.y))
    if (canvas.snap) { nw = roundTo(nw, canvas.grid); nh = roundTo(nh, canvas.grid) }
    b.w = +nw.toFixed(2); b.h = +nh.toFixed(2)
    renderBlocks(); syncSchema()
  })
  node.addEventListener('pointerup', () => { rez = null })
  node.addEventListener('pointercancel', () => { rez = null })
}

// === schema sync ===
function syncSchema() {
  schema.value = JSON.stringify({ page: canvas, blocks }, null, 2)
}

const zoom = ref(1) // 1 = 100%, 2 = 200%, 0.5 = 50%

watch(zoom, (val: number) => {
  const wrapper = document.querySelector('.canvas-wrapper') as HTMLElement
  if (wrapper) wrapper.style.transform = `scale(${val})`
})
</script>
<style lang="css">
.canvas { /* размеры ставишь из JS в мм */ }
.block { border:1px dashed #9ca3af; }
.block[data-selected="true"] { border-color:#111827; }
.content { width:100%; height:100%; outline:none; }
.resize { position:absolute; right:-5px; bottom:-5px; width:10px; height:10px; background:#111827; border-radius:2px; cursor:nwse-resize; }
.badge { position:absolute; top:-18px; right:0; transform:translateY(-100%); background:#111827; color:#fff; font-size:10px; padding:2px 6px; border-radius:6px; }
.ruler-x, .ruler-y { background:#fff; border:1px solid #e5e7eb; position:absolute; z-index:5; font-size:10px; color:#6b7280; }
.ruler-x { top:-22px; left:0; height:20px; }
.ruler-y { top:0; left:-22px; width:20px; }
.canvas-wrapper {
  transform-origin: top left;
}
.block { cursor: pointer; }
.block .content { cursor: pointer; }          /* текстовый блок */
.block img { cursor: pointer; }               /* картинка */
.block:active { cursor: grabbing; }
.resize { cursor: nwse-resize !important; }   /* уже есть, но на всякий */
.block img {
  pointer-events: none;         /* чтобы события шли в .block */
  -webkit-user-drag: none;      /* Safari/Chrome */
  user-drag: none;
  user-select: none;
}
</style>
