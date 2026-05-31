<template lang="pug">
.keybinding.keyboard-viewer-key(
  :is-focused="focused"
  :data-error="hasDuplicates")
  .label(@click="focus") {{props.label}}
  .shortcuts(v-if="focused")
    .value {{translate('settings.kb_mark_mode_input')}}
  .shortcuts(v-else-if="props.value.length")
    .shortcut-value(
      v-for="shortcut of props.value"
      :key="shortcut"
      :data-error="props.duplicates.includes(shortcut)")
      span(@click="focus") {{formatKeyboardViewerShortcut(shortcut)}}
      .shortcut-rm(@click.stop="removeShortcut(shortcut)"): svg: use(href="#icon_remove")
  .value(v-else @click="focus") ---
  input(
    type="text"
    tabindex="-1"
    ref="inputEl"
    @blur="focused = false"
    @keydown.prevent.stop="onKeydown")
  .icon-btn(@click="focus"): svg: use(href="#icon_plus")
</template>

<script lang="ts" setup>
import { computed, ref, nextTick } from 'vue'
import { translate } from 'src/dict'
import {
  formatKeyboardViewerShortcut,
  getKeyboardViewerShortcutCode,
} from 'src/services/keyboard-viewer-shortcuts'

const props = defineProps<{
  label: string
  value: string[]
  duplicates: string[]
}>()

const emit = defineEmits<{
  'add:value': [value: string]
  'remove:value': [value: string]
}>()

const inputEl = ref<HTMLInputElement | null>(null)
const focused = ref(false)
const hasDuplicates = computed((): boolean => props.duplicates.length > 0)

function focus(): void {
  focused.value = true
  nextTick(() => inputEl.value?.focus())
}

function onKeydown(e: KeyboardEvent): void {
  const shortcut = getKeyboardViewerShortcutCode(e)
  if (!shortcut) return

  emit('add:value', shortcut)
  inputEl.value?.blur()
}

function removeShortcut(shortcut: string): void {
  emit('remove:value', shortcut)
}
</script>
