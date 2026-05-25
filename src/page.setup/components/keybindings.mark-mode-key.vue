<template lang="pug">
.keybinding.mark-mode-key(
  :is-focused="focused"
  :data-error="duplicate")
  .label(@click="focus") {{props.label}}
  .value(v-if="focused") {{translate('settings.kb_mark_mode_input')}}
  .value(v-else-if="duplicate") {{translate('settings.kb_err_duplicate')}}
  .value(v-else @click="focus") {{props.value || '---'}}
  input(
    type="text"
    tabindex="-1"
    ref="inputEl"
    @blur="focused = false"
    @keydown.prevent.stop="onKeydown")
  .icon-btn(
    :data-enabled="!!props.value"
    @click="emit('update:value', '')"): svg: use(href="#icon_remove")
</template>

<script lang="ts" setup>
import { ref, nextTick } from 'vue'
import { translate } from 'src/dict'

const props = defineProps<{
  label: string
  value: string
  duplicate?: boolean
}>()

const emit = defineEmits<{
  'update:value': [value: string]
}>()

const inputEl = ref<HTMLInputElement | null>(null)
const focused = ref(false)

function focus(): void {
  focused.value = true
  nextTick(() => inputEl.value?.focus())
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    inputEl.value?.blur()
    return
  }

  if (e.key === 'Delete' || e.key === 'Backspace') {
    emit('update:value', '')
    inputEl.value?.blur()
    return
  }

  const key = getSingleKey(e)
  if (!key) return

  emit('update:value', key)
  inputEl.value?.blur()
}

function getSingleKey(e: KeyboardEvent): string | undefined {
  if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return

  if (e.code.startsWith('Digit')) return e.code.slice(5)
  if (e.code.startsWith('Key')) return e.code.slice(3)
  if (e.key === ',') return 'Comma'
  if (e.key === '.') return 'Period'
  if (e.key === ' ') return 'Space'
}
</script>
