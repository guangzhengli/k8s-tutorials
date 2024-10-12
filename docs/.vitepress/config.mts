import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Kubernetes 练习手册",
  description: "A tutorials for k8s",
  srcExclude: ['**/README.md'],
  sitemap: {
    hostname: 'https://k8s-tutorials.pages.dev'
  },
  
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'author', content: 'Guangzheng Li' }],
    ['meta', { name: 'keywords', content: 'kubernetes, k8s, tutorials, workshop, practice, guangzheng li' }],
    ['meta', { name: 'og:title', content: 'Kubernetes 练习手册' }],
    ['meta', { name: 'og:description', content: 'A tutorials for k8s' }],
    ['meta', { name: 'og:image', content: '/k8s.png' }],
    ['meta', { name: 'og:url', content: 'https://k8s-tutorials.pages.dev' }],
    ['meta', { name: 'google-site-verification', content: 'd13KXsNzbyvOCb8km5-Jja-m7nlizj8qJ_2mUSAOy2g' }],
    ['script', { async: '', src: 'https://analytics.guangzhengli.com/hugo-ladder', 'data-website-id': 'c566e0a6-b11d-4fdc-ab1c-fd0b5ac2d852', 'defer': '' }],
  ],
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    search: {
      provider: 'local'
    },
    editLink: {
      pattern: 'https://github.com/guangzhengli/k8s-tutorials/edit/main/:path'
    },
    nav: [
      { text: 'Home', link: '/' },
    ],

    sidebar: [
      {
        text: '开始',
        items: [
          { text: '准备工作', link: 'pre' },
        ]
      },
      {
        text: 'Kubernetes',
        items: [
          { text: 'Container', link: 'container' },
          { text: 'Pod', link: 'pod' },
          { text: 'Deployment', link: 'deployment' },
          { text: 'Service', link: 'service' },
          { text: 'Ingress', link: 'ingress' },
          { text: 'Namespace', link: 'namespace' },
          { text: 'ConfigMap', link: 'configmap' },
          { text: 'Secret', link: 'secret' },
          { text: 'Job', link: 'job' },
        ]
      },
      {
        text: 'Helm',
        items: [
          { text: 'Helm', link: 'helm' },
        ]
      },
      {
        text: 'Others',
        items: [
          { text: 'Dashboard', link: 'dashboard' },
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/guangzhengli/k8s-tutorials' },
      { icon: 'twitter', link: 'https://twitter.com/iguangzhengli' },
      { icon: { svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'}, 
                link: 'https://guangzhengli.com' },
      { icon: { svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-coffee"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/></svg>'}, 
                link: 'https://guangzhengli.com/sponsors' },
    ],
  }
})
