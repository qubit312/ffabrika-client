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
export const telegramAtUsername: Rule = v =>
  !v || /^@[A-Za-z0-9_]+$/.test(String(v)) || 'Ник должен начинаться с @; латиница, цифры и _'

// === Телефон РФ (+7) ===
export const stripDigits = (s: string) => String(s || '').replace(/\D+/g, '')

export const ruPhoneRule: Rule = v => {
  const d = stripDigits(String(v || ''))
  return (d.length === 11 && d.startsWith('7')) || 'Телефон в формате +7 (XXX) XXX-XX-XX'
}

export const formatRuPhone = (s: string) => {
  let d = stripDigits(s).slice(0, 11) // Limit to 11 digits
  if (d === '') return ''
  if (d[0] !== '7') d = '7' + d.slice(1, 10) // Ensure starts with 7 and max 11 digits
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

// === Условная обязательность ===
export const requiredIf = (cond: () => boolean, msg = 'Обязательное поле'): Rule => v =>
  (cond() ? required(v) === true : true) || msg

// === INN (10 для юрлиц, 12 для ИП) ===
export const innRule = (typeGetter?: () => string): Rule => v => {
  const s = stripDigits(String(v || ''))
  const isInd = typeGetter && typeGetter() === 'INDIVIDUAL'
  const len = isInd ? 12 : 10
  return (!s || s.length === len) || `ИНН должен содержать ${len} цифр`
}

// === ОГРНИП (15 цифр) ===
export const ogrnipRule: Rule = v => {
  const s = stripDigits(String(v || ''))
  return (!s || s.length === 15) || 'ОГРНИП должен содержать 15 цифр'
}

// === Расчётный счёт (20 цифр) ===
export const account20Rule: Rule = v => {
  const s = stripDigits(String(v || ''))
  return (!s || s.length === 20) || 'Счёт должен содержать 20 цифр'
}

// === Корр. счёт (20 цифр) ===
export const corrAccount20Rule: Rule = v => {
  const s = stripDigits(String(v || ''))
  return (!s || s.length === 20) || 'Корр. счёт должен содержать 20 цифр'
}

// === БИК (9 цифр) ===
export const bicRule: Rule = v => {
  const s = stripDigits(String(v || ''))
  return (!s || s.length === 9) || 'БИК должен содержать 9 цифр'
}

// === НДС (0–20, только цифры) ===
export const vatPercentRule: Rule = v => {
  if (!v) return true
  const num = Number(stripDigits(String(v)))
  return (Number.isFinite(num) && num >= 0 && num <= 20) || 'НДС должен быть от 0 до 20'
}

// === Опциональный телефон РФ ===
export const optionalRuPhone: Rule = v =>
  !v || ruPhoneRule(v) === true || 'Телефон в формате +7 (XXX) XXX-XX-XX'

// === Название банка (только буквы и пробелы) ===
export const bankNameRule: Rule = v =>
  !v || /^[A-Za-zА-Яа-я\s]+$/.test(String(v)) || 'Только буквы и пробелы'
