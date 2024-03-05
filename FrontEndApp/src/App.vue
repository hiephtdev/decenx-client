<script setup lang="ts">
import { computed, ref } from 'vue'
import Client from './components/Client.vue'
import Login from './components/Login.vue'
const tmpLogin = ref(false)
const isLogin = computed(() => {
  if (tmpLogin.value) {
    return true
  }
  return localStorage.getItem('token') ? true : false
})
const login = (token: string) => {
  if (token) {
    tmpLogin.value = true
    localStorage.setItem('token', token)
  }
}
</script>

<template>
  <template v-if="isLogin">
    <Client />
  </template>
  <template v-else>
    <Login @login="login" />
  </template>
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
}

.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}

.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
