import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Kubernetes 练习手册",
  description: "A tutorials for k8s",
  srcExclude: ['**/README.md'],
  sitemap: {
    hostname: 'https://k8s.guangzhengli.com'
  },
  
  head: [
    ['link', { rel: 'icon', href: '/base/favicon.ico' }],
    ['meta', { name: 'author', content: 'Guangzheng Li' }],
    ['meta', { name: 'keywords', content: 'kubernetes, k8s, tutorials, workshop, practice, guangzheng li' }],
    ['meta', { name: 'og:title', content: 'Kubernetes 练习手册' }],
    ['meta', { name: 'og:description', content: 'A tutorials for k8s' }],
    ['meta', { name: 'og:image', content: '/base/k8s.png' }],
    ['meta', { name: 'og:url', content: 'https://k8s.guangzhengli.com' }],
    ['script', { async: '', src: 'https://umami-ochre-nu.vercel.app/umami.js', 'data-website-id': 'c566e0a6-b11d-4fdc-ab1c-fd0b5ac2d852', 'defer': '' }],
  ],
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
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
          { text: '准备工作', link: 'docs/pre' },
        ]
      },
      {
        text: 'Kubernetes',
        items: [
          { text: 'Container', link: 'docs/container' },
          { text: 'Pod', link: 'docs/pod' },
          { text: 'Deployment', link: 'docs/deployment' },
          { text: 'Service', link: 'docs/service' },
          { text: 'Ingress', link: 'docs/ingress' },
          { text: 'Namespace', link: 'docs/namespace' },
          { text: 'ConfigMap', link: 'docs/configmap' },
          { text: 'Secret', link: 'docs/secret' },
          { text: 'Job', link: 'docs/job' },
        ]
      },
      {
        text: 'Helm',
        items: [
          { text: 'Helm', link: 'docs/helm' },
        ]
      },
      {
        text: 'Others',
        items: [
          { text: 'Dashboard', link: 'docs/dashboard' },
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
