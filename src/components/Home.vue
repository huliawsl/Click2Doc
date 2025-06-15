<template>
    <div class="home">
        <h1 class="title">Welcome to StepCraft</h1>
        <div class="msg">{{ msg }}</div>
        <div class="btn">
            <button class="new">Create a step record</button>
            <button class="open">Open a step record</button>
        </div>
    </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'

const msg = ref('Create tutorials and guides effortlessly. Start a new project or open an existing one to begin.')

</script>
<style lang="less">
.home {
    flex: 1;
    text-align: center;

    .title {
        margin: 0 auto;
        margin-top: 72px;
        height: auto;
        font-size: 32px;
        font-weight: 700;
        line-height: 40px;
    }

    .msg {
        margin: 0 auto;
        margin-top: 21px;
         padding: 0 20px;
    }

    .btn {
        display: flex;
        justify-content: center;
        gap: 41px;
        margin-top: 40px;
        flex-wrap: wrap;
         padding: 0 20px;
        button {
            width: 302px;
            height: 50px;
            border-radius: 20px;
        }

        .new {
            background: rgba(220, 232, 243, 1);
            font-weight: 700;
        }

        .open {
            background: rgba(241, 242, 244, 1);
            font-weight: 700;
        }
    }
}
</style>