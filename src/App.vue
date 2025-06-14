<script setup lang="ts">
import Navigation from './components/Navigation.vue';
</script>

<template>
  <div class="shell">
    <Navigation />
    <router-view></router-view>
  </div>
</template>

<style lang="less">
.shell {
  display: flex;
  min-height: 100vh;
}

.under {
  background: radial-gradient(50% 50% at 50% 50%, #121518 0%, #171b1f 100%);
}
</style>
