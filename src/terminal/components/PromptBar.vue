<script setup lang="ts">
import { computed } from 'vue'

import { siteConfig } from '@/config/site'
import { formatPromptPath } from '@/terminal/prompt'

const props = defineProps<{ cwd: string }>()

const pathLabel = computed(() => formatPromptPath(props.cwd, siteConfig.homeDir))
</script>

<template>
  <span class="prompt" aria-hidden="true">
    <span class="prompt__identity">{{ siteConfig.username }}@{{ siteConfig.hostname }}</span>
    <span class="prompt__separator">{{ ' ' }}</span>
    <span class="prompt__path">{{ pathLabel }}</span>
    <span class="prompt__separator">{{ ' ' }}</span>
    <span class="prompt__symbol">%</span>
    <span class="prompt__separator">{{ ' ' }}</span>
  </span>
</template>
