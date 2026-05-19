export function createRouteRegistry(modules = []){
  const routeModules = modules.filter(Boolean);
  return {
    manifest(){ return { ok:true, version:'18.0.0', moduleCount:routeModules.length, modules:routeModules.map(mod => ({ name:mod.name, area:mod.area, routes:mod.routes || [], owns:mod.owns || [] })) }; },
    async handle(ctx){ for(const mod of routeModules){ if(typeof mod.handle !== 'function') continue; const result = await mod.handle(ctx); if(result && result.handled) return result; } return { handled:false }; }
  };
}
