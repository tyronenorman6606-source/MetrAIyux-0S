import { get, route } from 'remix/routes'

export const routes = route({
  assets: get('/assets/*path'),
  status: get('/api/status'),
  catalog: get('/api/catalog'),
  targets: get('/api/targets'),
  worlds: get('/api/worlds'),
  plan: get('/api/plan'),
  build: get('/api/build'),
  mine: get('/api/mine'),
  proof: get('/api/proof'),
  generatedWorld: get('/generated-worlds/:world'),
  home: '/',
})
