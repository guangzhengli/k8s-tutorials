<script setup lang="ts">
import { useData } from 'vitepress'
import { watchEffect } from 'vue'

const { title, isDark } = useData()
let darkTheme = isDark.value ? 'dark' : 'light'

watchEffect(() => {
  darkTheme = isDark.value ? 'dark' : 'light'
})

</script>

<template>
  <div class="layout-comments">
    <component
      :is="'script'"
      :key="title"
      src="https://giscus.app/client.js"
      data-repo="guangzhengli/k8s-tutorials"
      data-repo-id="R_kgDOHS_wpg"
      data-category="General"
      data-category-id="DIC_kwDOHS_wps4CRGNY"
      data-mapping="pathname"
      data-strict="0"
      data-reactions-enabled="1"
      data-emit-metadata="0"
      data-input-position="bottom"
      :data-theme="darkTheme"
      data-lang="en"
      data-loading="lazy"
      crossorigin="anonymous"
      async
    />
  </div>
</template>
