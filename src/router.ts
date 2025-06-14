import { createRouter, createWebHashHistory } from 'vue-router';
import Home from './components/Home.vue';
import Lib from './components/Lib.vue';
import Settings from './components/Settings.vue';


const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'Home', component: Home },
    { path: '/library', name: 'Lib', component: Lib },
    { path: '/settings', name: 'Settings', component: Settings }
  ]
});

export default router;
