(function(global){
  function gateBridge(){
    return global.MetrAIyuxGateBridge || (global.parent && global.parent !== global ? global.parent.MetrAIyuxGateBridge : null);
  }

  function current(){
    return gateBridge()?.current?.() || null;
  }

  function token(){
    return String(current()?.token || "");
  }

  const api = {
    tokenKey: "FS27_GATE_SESSION",
    getToken(){
      return token();
    },
    setToken(){
      return token();
    },
    getKeyLast4(){
      const value = token();
      return value ? value.slice(-4) : "";
    },
    setKeyLast4(){
      return this.getKeyLast4();
    },
    setSession(session){
      if (session?.token) gateBridge()?.persist?.({
        ...session,
        source: session.source || "0s-gate-card-bridge",
        usage_lane: "kaixu-ai"
      }, { silent: true });
      return token();
    },
    clear(){
      gateBridge()?.clear?.();
    },
    isAuthenticated(){
      return !!token();
    }
  };

  global.KaixuSession = api;
})(globalThis);
