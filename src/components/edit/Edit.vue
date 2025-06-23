<template>
  <div class="edit">
    <div class="workspace">
      <button class="back-button" @click="backToHome">
        <img src="/left.png" />
      </button>
    </div>
    <div class="sidebar">
      <button class="sap" :class="{active: isActive}" @click="toggleSap">
        {{ sap }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
const sap = ref("Start");
const isActive = ref(false);
const router = useRouter();
const backToHome = () => {
  router.push("/");
};
const toggleSap = () => {
  sap.value = sap.value === "Start" ? "Pause" : "Start";
  isActive.value = !isActive.value;
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

    .sap {
      width: 200px;
      height: 40px;
      border-radius: 20px;
      background: rgba(220, 232, 243, 1);
      font-weight: 700;
      cursor: pointer;
      transition: 0.2s;
      &.active {
        background: #ff0000;
        color: white;
      }
    }
    button:focus {
      outline: none;
    }
  }
}
</style>
