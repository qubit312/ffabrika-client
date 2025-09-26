<script setup lang="ts">
import { setPageLayout } from '#app'

definePageMeta({
  public: true, 
})

const route = useRoute()
const router = useRouter()

const fromRegister = computed(() => String(route.query.from || '') === 'register')

watchEffect(() => {
  setPageLayout(fromRegister.value ? 'blank' : 'default')
})

const goBack = () => router.push('/register')
</script>
<template>
  <div class="oferta mx-auto px-4 py-8" style="max-width: 920px;">
    <div v-if="fromRegister" class="mb-4 d-flex align-center">
      <VBtn variant="text" prepend-icon="tabler-arrow-left" @click="goBack">
        Назад к регистрации
      </VBtn>
    </div>

    <h1 class="text-h4 mb-6">Публичная оферта</h1>
    <p class="text-medium-emphasis mb-6">
      Актуальная редакция от {{ new Date().toLocaleDateString('ru-RU') }}.
    </p>

    <VCard variant="outlined" class="mb-6">
      <VCardText>
        <h2 class="text-h6 mb-3">1. Общие положения</h2>
        <p>
          Настоящий документ является официальным предложением (офертой) заключить договор оказания услуг
          в соответствии со ст. 437 ГК РФ. Принимая условия, Пользователь подтверждает согласие с офертой.
        </p>
      </VCardText>
    </VCard>

    <VCard variant="outlined" class="mb-6">
      <VCardText>
        <h2 class="text-h6 mb-3">2. Предмет договора</h2>
        <p>
          Мы предоставляем доступ к сервису для управления товарами, маркировкой и связанными функциями.
          Конкретный перечень и тарифы могут уточняться в интерфейсе сервиса.
        </p>
      </VCardText>
    </VCard>

    <VCard variant="outlined" class="mb-6">
      <VCardText>
        <h2 class="text-h6 mb-3">3. Права и обязанности сторон</h2>
        <ul class="mb-0">
          <li>Пользователь обязуется соблюдать правила сервиса и действующее законодательство.</li>
          <li>Мы обеспечиваем работу сервиса и вправе обновлять функциональность.</li>
        </ul>
      </VCardText>
    </VCard>

    <VCard variant="outlined" class="mb-6">
      <VCardText>
        <h2 class="text-h6 mb-3">4. Персональные данные</h2>
        <p>
          Обработка персональных данных осуществляется в соответствии с Политикой конфиденциальности.
        </p>
      </VCardText>
    </VCard>

    <VCard variant="outlined" class="mb-6">
      <VCardText>
        <h2 class="text-h6 mb-3">5. Заключительные положения</h2>
        <p>
          Оферта может быть изменена. Новая редакция вступает в силу с момента публикации.
        </p>
      </VCardText>
    </VCard>

    <div class="text-medium-emphasis">
      Если у вас есть вопросы — свяжитесь с поддержкой.
    </div>
  </div>
</template>

<style scoped>
.oferta :deep(h2){ margin-top: .25rem; }
</style>
