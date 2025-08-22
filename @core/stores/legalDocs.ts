import { defineStore } from 'pinia'

export type LegalDoc = {
  id: string
  title: string
  content?: string
  fileName?: string
  fileUrl?: string
  updatedAt: string
}

const STORAGE_KEY = 'legal_docs_demo'

export const useLegalDocs = defineStore('legalDocs', {
  state: () => ({
    docs: [] as LegalDoc[],
    loaded: false,
  }),
  actions: {
    load() {
      if (this.loaded) return
      const raw = process.client ? localStorage.getItem(STORAGE_KEY) : null
      this.docs = raw ? JSON.parse(raw) : [
        { id: '1', title: 'Договор оферты', content: 'Текст оферты…', updatedAt: new Date().toISOString() },
        { id: '2', title: 'Приложение №1 (Тарифы)', content: 'Текст приложения…', updatedAt: new Date().toISOString() },
      ]
      this.loaded = true
    },
    persist() {
      if (process.client) localStorage.setItem(STORAGE_KEY, JSON.stringify(this.docs))
    },
    addDoc(payload: { title: string; content?: string; fileName?: string; fileUrl?: string }) {
      const id = String(Date.now())
      const doc: LegalDoc = { id, updatedAt: new Date().toISOString(), ...payload }
      this.docs.unshift(doc)
      this.persist()
      return id
    },
    updateDoc(id: string, patch: Partial<LegalDoc>) {
      const i = this.docs.findIndex(d => d.id === id)
      if (i !== -1) {
        this.docs[i] = { ...this.docs[i], ...patch, updatedAt: new Date().toISOString() }
        this.persist()
      }
    },
    removeDoc(id: string) {
      this.docs = this.docs.filter(d => d.id !== id)
      this.persist()
    },
    getDoc(id: string) {
      return this.docs.find(d => d.id === id)
    },
  },
})
