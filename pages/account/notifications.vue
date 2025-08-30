<script setup lang="ts">
const isSaving = ref(false)

const supportBrowserNotif = process.client && 'Notification' in window
const permission = ref<'default' | 'granted' | 'denied'>(supportBrowserNotif ? Notification.permission : 'denied')
const browserAllowed = computed(() => permission.value === 'granted')
const requestPermission = async () => {
  if (!supportBrowserNotif) return
  try { permission.value = await Notification.requestPermission() } catch {}
}

type Row = { key: string; label: string; email: boolean; browser: boolean; app: boolean }
const rows = reactive<Row[]>([
  { key: 'new_for_you',  label: 'Новое для вас',               email: true,  browser: false, app: true },
  { key: 'acc_activity', label: 'Активность аккаунта',         email: true,  browser: false, app: true },
  { key: 'new_browser',  label: 'Вход с нового браузера',      email: true,  browser: false, app: false },
  { key: 'new_device',   label: 'Подключено новое устройство', email: true,  browser: false, app: false },
])

const scheduleOptions = ['Только когда я онлайн', 'Всегда', 'Только в рабочее время (09:00–18:00)']
const schedule = ref(scheduleOptions[0])

const snack = reactive({ show: false, text: '', color: 'success' as 'success' | 'error' })
const notify = (t: string, c: 'success'|'error'='success') => { snack.text=t; snack.color=c; snack.show=true }

const reset = () => {
  rows[0] = Object.assign(rows[0], { email: true,  browser: false, app: true  })
  rows[1] = Object.assign(rows[1], { email: true,  browser: false, app: true  })
  rows[2] = Object.assign(rows[2], { email: true,  browser: false, app: false })
  rows[3] = Object.assign(rows[3], { email: true,  browser: false, app: false })
  schedule.value = scheduleOptions[0]
  notify('Изменения отменены')
}
const save = async () => {
  isSaving.value = true
  try {
    await new Promise(r => setTimeout(r, 400))
    notify('Настройки уведомлений сохранены')
  } catch { notify('Не удалось сохранить', 'error') }
  finally { isSaving.value = false }
}
</script>

<template>
  <VCard :loading="isSaving" class="notifications-card">
    <VCardItem>
      <VCardTitle>Уведомления</VCardTitle>
      <p class="text-body-1 mb-0">
        Чтобы показывать уведомления через браузер, нужно разрешение.
        <span class="text-primary cursor-pointer" @click="requestPermission">Запросить разрешение</span>
        <span v-if="supportBrowserNotif" class="ms-2 text-medium-emphasis">(текущее состояние: {{ permission }})</span>
        <span v-else class="ms-2 text-error">Браузер не поддерживает Notifications API</span>
      </p>
    </VCardItem>

    <VCardText >
      <VDivider />

      <div class="v-table text-no-wrap rounded table-notifs">
        <div class="v-table__wrapper">
          <table>
            <thead>
              <tr>
                <th class="col-type">ТИП</th>
                <th class="col-chan text-center">EMAIL</th>
                <th class="col-chan text-center">БРАУЗЕР</th>
                <th class="col-chan text-center">ПРИЛОЖЕНИЕ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in rows" :key="r.key">
                <td class="text-body-1 text-high-emphasis">{{ r.label }}</td>
                <td class="text-center">
                  <div class="d-flex justify-center"><VCheckbox v-model="r.email" hide-details density="compact" /></div>
                </td>
                <td class="text-center">
                  <div class="d-flex justify-center">
                    <VCheckbox
                      v-model="r.browser"
                      :disabled="!browserAllowed"
                      :messages="browserAllowed ? undefined : ['Нет разрешения браузера']"
                      hide-details
                      density="compact"
                    />
                  </div>
                </td>
                <td class="text-center">
                  <div class="d-flex justify-center"><VCheckbox v-model="r.app" hide-details density="compact" /></div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <VDivider class="my-4" />

      <VForm @submit.prevent="save">
        <div class="mb-2 text-body-1 font-weight-medium">Когда присылать уведомления?</div>
        <VRow>
          <VCol cols="12" sm="6">
            <VSelect v-model="schedule" :items="scheduleOptions" variant="outlined" />
          </VCol>
        </VRow>

        <div class="d-flex flex-wrap gap-4 mt-6">
          <VBtn type="submit" color="primary" :loading="isSaving">Сохранить изменения</VBtn>
          <VBtn type="reset" variant="tonal" color="secondary" @click="reset">Отмена</VBtn>
        </div>
      </VForm>
    </VCardText>
  </VCard>

  <VSnackbar v-model="snack.show" :color="snack.color" location="top end" timeout="2500">
    {{ snack.text }}
  </VSnackbar>
</template>

<style scoped>
.notifications-card { overflow: hidden; }
.table-notifs thead th { font-weight: 600; letter-spacing: .02em; }

.table-notifs td, .table-notifs th { padding: 14px 16px !important; }
</style>
