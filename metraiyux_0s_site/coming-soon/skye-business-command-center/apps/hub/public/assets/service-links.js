(function () {
  const services = {
    freescout: { port: '8081', subdomain: 'support', label: 'Support Desk' },
    espocrm: { port: '8082', subdomain: 'crm', label: 'CRM' },
    invoiceshelf: { port: '8083', subdomain: 'billing', label: 'Billing Admin' },
    formbricks: { port: '8084', subdomain: 'forms', label: 'Form Builder' }
  };

  function subdomainUrl(service) {
    const loc = window.location;
    const parts = loc.hostname.split('.');
    if (parts.length < 3) return null;
    if (!['ops', 'hub', 'admin', 'app'].includes(parts[0])) return null;
    parts[0] = service.subdomain;
    return `${loc.protocol}//${parts.join('.')}`;
  }

  function urlFor(service) {
    const loc = window.location;
    const host = loc.host;
    const protocol = loc.protocol || 'http:';

    if (host.includes('-8080.') && host.endsWith('.app.github.dev')) {
      return `${protocol}//${host.replace('-8080.', `-${service.port}.`)}`;
    }

    if (host.startsWith('localhost:') || host.startsWith('127.0.0.1:')) {
      return `${protocol}//${loc.hostname}:${service.port}`;
    }

    const mapped = subdomainUrl(service);
    if (mapped) return mapped;

    return `${protocol}//${host}`;
  }

  function applyServiceLinks() {
    document.querySelectorAll('[data-service]').forEach((link) => {
      const service = services[link.dataset.service];
      if (!service) return;
      const href = urlFor(service);
      link.href = href;
      link.target = '_blank';
      link.rel = 'noreferrer';
      const target = link.querySelector('[data-service-url]');
      if (target) target.textContent = new URL(href).host + ' ->';
    });
  }

  document.addEventListener('DOMContentLoaded', applyServiceLinks);
}());
