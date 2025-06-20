<template>
  <div class="edit">
    <div class="workspace">
      <button class="back-button" @click="backToHome">
        <img src="/left.png" />
      </button>
    </div>
    <div class="sidebar">123</div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
const router = useRouter();
const backToHome = () => {
  router.push("/");
};
</script>

<style lang="less">
.edit {
  display: flex;
  min-height: 100vh;
  width: 100%;
  flex-direction: row;
  .workspace {
    flex: 1;
    .back-button {
      margin-left: 40px;
      margin-top: 40px;
      width: 24px;
      height: 24px;
      padding: 0;
      cursor: pointer;

      img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
    }
  }

  .sidebar {
    width: 246px;
    border-left: 1px solid #cfd6e0;
  }
}
</style>
