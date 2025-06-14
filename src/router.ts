import { createRouter, createWebHashHistory } from 'vue-router';
import Lib from './components/Lib.vue';
import Settings from './components/Settings.vue';


const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'Library', component: Lib },
    { path: '/settings', name: 'Settings', component: Settings }
  ]
});

export default router;
