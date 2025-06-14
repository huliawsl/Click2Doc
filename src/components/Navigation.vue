<template>
    <div class="navigation">
        <h1 class="title">StepCraft</h1>
        <nav class="nav">
            <ul>
                <router-link to="/">
                    <li :class="{ 'active': $route.path === '/' }">
                        <img :src="$route.path === '/' ? '/nav/home_f.png' : '/nav/home.png'" />
                        <span>Home</span>
                    </li>
                </router-link>
                <router-link to="/library">
                    <li :class="{ 'active': $route.path === '/library' }">
                        <img :src="$route.path === '/library' ? '/nav/library_f.png' : '/nav/library.png'" />
                        <span>Library</span>
                    </li>
                </router-link>
                <router-link to="/templates">
                    <li :class="{ 'active': $route.path === '/templates' }">
                        <img :src="$route.path === '/templates' ? '/nav/templates_f.png' : '/nav/templates.png'" />
                        <span>Templates</span>
                    </li>
                </router-link>
                <router-link to="/settings">
                    <li :class="{ 'active': $route.path === '/settings' }">
                        <img :src="$route.path === '/settings' ? '/nav/settings_f.png' : '/nav/settings.png'" />
                        <span>Settings</span>
                    </li>
                </router-link>
            </ul>
        </nav>
    </div>
</template>

<script lang="ts" setup>
import { useRoute } from 'vue-router';
const $route = useRoute();
</script>

<style lang="less" scoped>
.navigation {
    padding-right: 20px;
    width: 320px;
    background-color: #F7FAFC;
    border-right: 1px solid #cfd6e0;

    .title {
        margin: 36px 0 0 40px;
        font-size: 24px;
        font-family: Inter;
    }

    ul {
        margin: 36px 0 0 40px;

        li {
            margin-bottom: 8px;
            height: 40px;
            align-items: center;
            border-radius: 8px;

            &.active {
                background: rgba(232, 237, 245, 1);
            }

            img {
                height: 24px;
                margin-left: 12px;
                display: inline-block;
                vertical-align: middle;
            }

            span {
                margin-left: 12px;
                height: 40px;
                line-height: 40px;
                font-size: 14px;
                display: inline-block;
                text-align: center;
                vertical-align: middle;
                color: #373636;

            }
        }
    }
}
</style>