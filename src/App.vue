<script setup lang="ts">
import Navigation from './components/Navigation.vue';
</script>

<template>
  <div class="shell">
    <Navigation />
    <transition name="fade">
      <router-view></router-view>
    </transition>
  </div>
</template>

<style lang="less">
.shell {
  display: flex;
  min-height: 100vh;
  flex-direction: row;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
