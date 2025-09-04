export type Rule = (v: any) => true | string

// === Базовые ===
export const required: Rule = v =>
  (v !== null && v !== undefined && String(v).trim() !== '') || 'Обязательное поле'

export const email: Rule = v =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '')) || 'Неверный email'

// Опциональный email (валидируем, только если заполнен)
export const optionalEmail: Rule = v =>
  !v || email(v) === true || 'Неверный email'

export const minLen = (n: number): Rule => v =>
  ((v?.length ?? 0) >= n) || `Минимум ${n} символов`

export const match = (other: () => string, msg = 'Значения не совпадают'): Rule => v =>
  String(v ?? '') === String(other() ?? '') || msg

// === Цифровые поля ===
export const digitsLen = (len: number): Rule => v =>
  !v || new RegExp(`^\\d{${len}}$`).test(String(v)) || `Должно быть ${len} цифр`

export const numberInRange = (min: number, max: number): Rule => v => {
  if (v === '' || v === null || v === undefined) return true
  const num = Number(v)
  return (Number.isFinite(num) && num >= min && num <= max) || `Допустимо ${min}–${max}`
}

// === Telegram ===
export const telegramUsername: Rule = v =>
  !v || /^[A-Za-z0-9_]+$/.test(String(v)) || 'Только латиница, цифры и _'

// === Телефон РФ (+7) ===
export const stripDigits = (s: string) => String(s || '').replace(/\D+/g, '')
export const ruPhoneRule: Rule = v => {
  const d = stripDigits(String(v || ''))
  return (d.length === 11 && (d.startsWith('7') || d.startsWith('8'))) || 'Телефон в формате +7XXXXXXXXXX'
}

// Форматирование для поля ввода (по желанию можно вызывать по input)
export const formatRuPhone = (s: string) => {
  const d = stripDigits(s)
  const a = d.slice(1, 4)
  const b = d.slice(4, 7)
  const c = d.slice(7, 9)
  const e = d.slice(9, 11)
  let out = '+7'
  if (a) out += ` (${a}`
  if (a.length === 3) out += ')'
  if (b) out += ` ${b}`
  if (c) out += `-${c}`
  if (e) out += `-${e}`
  return out
}

// === Пароль ===
export interface PasswordPolicy {
  min: number
  requireLower?: boolean
  requireUpper?: boolean
  requireDigit?: boolean
  requireSpecial?: boolean
}

export const checkPassword = (v: string, p: PasswordPolicy) => {
  const s = String(v || '')
  const res = {
    len: s.length >= p.min,
    lower: !p.requireLower || /[a-zA-ZА-Яа-я]/.test(s),
    upper: !p.requireUpper || /[A-ZА-Я]/.test(s),
    digit: !p.requireDigit || /\d/.test(s),
    special: !p.requireSpecial || /[^\w\s]/.test(s),
  }
  const fails: string[] = []
  if (!res.len) fails.push(`не менее ${p.min} символов`)
  if (p.requireLower && !res.lower) fails.push('буква')
  if (p.requireUpper && !res.upper) fails.push('заглавная буква')
  if (p.requireDigit && !res.digit) fails.push('цифра')
  if (p.requireSpecial && !res.special) fails.push('спецсимвол')
  return { ok: fails.length === 0, fails, ...res }
}

export const passwordRule = (p: PasswordPolicy): Rule => v => {
  const r = checkPassword(String(v || ''), p)
  return r.ok || `Пароль: ${r.fails.join(', ')}`
}
