import adapter from '@sveltejs/adapter-node';

export default {
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: null
    }),
    paths: {
      base: '/pages/2025/vikas/catan'
    }
  }
};