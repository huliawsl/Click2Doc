import { createRouter, createWebHashHistory } from 'vue-router';
import Home from './components/start/Home.vue';
import Lib from './components/start/Lib.vue';
import Templates from './components/start/Templates.vue';
import Settings from './components/start/Settings.vue';
import Edit from './components/edit/Edit.vue';


const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'Home', component: Home },
    { path: '/library', name: 'Lib', component: Lib },
    { path: '/templates', name: 'Templates', component: Templates },
    { path: '/settings', name: 'Settings', component: Settings },
    {
      path: '/edit',
      name: 'Edit',
      component: Edit,
      meta: { showNavigation: false }
    }
  ]
});

export default router;
