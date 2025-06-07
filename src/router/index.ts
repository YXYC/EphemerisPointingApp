import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/browse',
    name: 'Browse',
    component: () => import('../views/BrowseView.vue')
  },
  {
    path: '/ephemeris',
    name: 'Ephemeris',
    component: () => import('../views/EphemerisView.vue'),
    children: [
      {
        path: '',
        redirect: 'single'
      },
      {
        path: 'single',
        name: 'EphemerisSingle',
        component: () => import('../views/ephemeris/SingleCalc.vue')
      },
      {
        path: 'batch',
        name: 'EphemerisBatch',
        component: () => import('../views/ephemeris/BatchCalc.vue')
      }
    ]
  },
  {
    path: '/help',
    name: 'Help',
    component: () => import('../views/HelpView.vue')
  },
  {
    path: '/',
    redirect: '/browse'
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 全局前置守卫
router.beforeEach((to: any, _from: any, next: any) => {
  // 确保路由切换时组件会被正确加载
  if (to.matched.length === 0) {
    next('/browse')
  } else {
    next()
  }
})

export default router