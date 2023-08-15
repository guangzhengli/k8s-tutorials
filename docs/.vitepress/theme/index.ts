// https://vitepress.dev/guide/custom-theme
import Theme from 'vitepress/theme'
import MyLayout from './layout/MyLayout.vue'
import './style.css'

export default {
  extends: Theme,
  Layout: MyLayout,
  enhanceApp({ app, router, siteData }) {
    // ...
  }
}
