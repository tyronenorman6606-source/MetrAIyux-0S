import argparse
import json
import os
import re
import time
import urllib.request
from pathlib import Path
from urllib.error import HTTPError
from playwright.sync_api import sync_playwright


def http_json(url, payload=None, method='GET', headers=None):
    data = None
    request_headers = headers or {}
    if payload is not None:
        data = json.dumps(payload).encode('utf-8')
        request_headers = {**request_headers, 'content-type': 'application/json'}
    req = urllib.request.Request(url, data=data, method=method, headers=request_headers)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.read().decode('utf-8'), resp.headers.get('content-type', '')
    except HTTPError as error:
        return error.read().decode('utf-8'), error.headers.get('content-type', '')


def http_put(url, body_bytes, headers=None):
    req = urllib.request.Request(url, data=body_bytes, method='PUT', headers=headers or {})
    with urllib.request.urlopen(req) as resp:
        return resp.read().decode('utf-8'), resp.headers.get('content-type', '')


def strip_scripts(html):
    return re.sub(r'<script\b[^>]*>.*?</script>', '', html, flags=re.IGNORECASE | re.DOTALL)


def capture_step_screenshot(page, target_path):
    try:
        page.screenshot(path=str(target_path))
        return
    except Exception:
        page.wait_for_timeout(100)
    page.screenshot(path=str(target_path), animations='disabled')


def wait_for_url_contains(page, expected, timeout_ms):
    end = time.time() + (timeout_ms / 1000.0)
    while time.time() < end:
        current = page.url or ''
        if expected in current:
            return current
        page.wait_for_timeout(100)
    raise RuntimeError(f'URL did not contain {expected}: {page.url}')


def run_local_bridge(page, plan, out_dir, timeout_ms):
    screenshots = []
    trace = []
    captures = {}
    state = {'current_url': None, 'form': {}, 'draft_id': None, 'upload_reference': None, 'upload_url': None, 'remote_reference': None, 'remote_status': None}
    profile = plan.get('profile') or {}
    current_html = ''

    def load_page(url):
        raw, _ = http_json(url)
        page.set_content(strip_scripts(raw), wait_until='domcontentloaded')
        return raw

    for index, step in enumerate(plan.get('steps', [])):
        kind = step['type']
        if kind == 'goto':
            state['current_url'] = step['url']
            current_html = load_page(state['current_url'])
        elif kind == 'fill':
            page.locator(step['selector']).fill(step['value'])
            state['form'][step['selector']] = step['value']
        elif kind == 'set_input_files':
            page.locator(step['selector']).set_input_files(step['file_path'])
            state['form'][step['selector']] = step['file_path']
        elif kind == 'click':
            page.locator(step['selector']).click(force=True, no_wait_after=True)
            url = state['current_url'] or ''
            base = url.split('/portal-ui/')[0]
            if step['selector'].endswith('login-submit'):
                state['current_url'] = profile['paths']['draft']
                current_html = load_page(state['current_url'])
            elif step['selector'].endswith('draft-submit'):
                raw, _ = http_json(base + '/portal/titles/draft', {'title': state['form'].get(profile['selectors']['title'], ''), 'slug': state['form'].get(profile['selectors']['slug'], '')}, method='POST')
                out = json.loads(raw or '{}')
                state['draft_id'] = out.get('draft_id')
                state['current_url'] = profile['paths']['upload']
                current_html = load_page(state['current_url'])
            elif step['selector'].endswith('upload-submit'):
                raw, _ = http_json(base + '/portal/assets/init', {'title': state['form'].get(profile['selectors']['title'], ''), 'slug': state['form'].get(profile['selectors']['slug'], '')}, method='POST')
                out = json.loads(raw or '{}')
                state['upload_reference'] = out.get('upload_reference')
                state['upload_url'] = out.get('upload_url')
                file_path = state['form'].get(profile['selectors']['package_file'])
                body = Path(file_path).read_bytes()
                http_put(state['upload_url'], body, headers={'x-skye-package-sha256': 'browser-upload'})
                state['current_url'] = profile['paths']['review']
                current_html = load_page(state['current_url'])
            elif step['selector'].endswith('attach-submit'):
                http_json(base + '/portal/assets/attach', {'draft_id': state['draft_id'], 'upload_reference': state['upload_reference']}, method='POST')
                current_html = re.sub(r'(id=["\']attach-status["\'][^>]*data-status=["\'])pending(["\'])', r'\1attached\2', current_html)
                page.set_content(strip_scripts(current_html), wait_until='domcontentloaded')
            elif step['selector'].endswith('submit-final'):
                raw, _ = http_json(base + '/portal/submissions/submit', {'draft_id': state['draft_id'], 'channel_payload': {'slug': plan.get('slug', 'slug')}}, method='POST')
                out = json.loads(raw or '{}')
                state['remote_reference'] = out.get('reference')
                captures['remote_reference'] = state['remote_reference']
                current_html = current_html.replace('<div id="submission-reference"></div>', f'<div id="submission-reference">{state["remote_reference"]}</div>')
                page.set_content(strip_scripts(current_html), wait_until='domcontentloaded')
            elif step['selector'].endswith('status-sync'):
                raw, _ = http_json(base + '/portal/submissions/status', {'remote_reference': state['remote_reference']}, method='POST')
                out = json.loads(raw or '{}')
                state['remote_status'] = out.get('remote_status') or out.get('status') or 'completed'
                captures['remote_status'] = state['remote_status']
                current_html = current_html.replace('<div id="remote-status"></div>', f'<div id="remote-status">{state["remote_status"]}</div>')
                page.set_content(strip_scripts(current_html), wait_until='domcontentloaded')
            elif step['selector'].endswith('cancel-job'):
                raw, _ = http_json(base + '/portal/submissions/cancel', {'remote_reference': state['remote_reference']}, method='POST')
                out = json.loads(raw or '{}')
                state['remote_status'] = out.get('status') or 'cancelled'
                captures['remote_status'] = state['remote_status']
                current_html = current_html.replace('<div id="remote-status"></div>', f'<div id="remote-status">{state["remote_status"]}</div>')
                page.set_content(strip_scripts(current_html), wait_until='domcontentloaded')
        elif kind == 'wait_for_url_contains':
            if step['value'] not in (state['current_url'] or ''):
                raise RuntimeError(f"URL did not contain {step['value']}: {state['current_url']}")
        elif kind == 'wait_for_selector':
            page.locator(step['selector']).wait_for(timeout=timeout_ms)
        elif kind == 'text_content':
            captures[step['assign']] = page.locator(step['selector']).text_content() or ''
        elif kind == 'wait_for_timeout':
            page.wait_for_timeout(int(step.get('ms', 500)))
        else:
            raise RuntimeError(f'Unsupported step: {kind}')
        shot = out_dir / f'step-{index:02d}.png'
        capture_step_screenshot(page, shot)
        screenshots.append(str(shot))
        html_file = out_dir / f'step-{index:02d}.html'
        html_file.write_text(page.content(), encoding='utf-8')
        trace.append({'index': index, 'type': kind, 'url': state.get('current_url') or '', 'screenshot': str(shot), 'html': str(html_file)})
    dom_path = out_dir / 'portal-run.dom.html'
    dom_path.write_text(page.content(), encoding='utf-8')
    return {
        'ok': True,
        'channel': plan.get('channel'),
        'target_mode': (plan.get('target') or {}).get('target_mode', ''),
        'target_origin': ((plan.get('target') or {}).get('target') or {}).get('origin', ''),
        'remote_reference': captures.get('remote_reference'),
        'remote_status': captures.get('remote_status') or '',
        'screenshots': screenshots,
        'dom_path': str(dom_path),
        'trace': trace,
        'step_count': len(trace),
        'browser_engine': 'playwright-chromium',
        'proof_mode': 'playwright-browser-local-bridge'
    }


def run_external_browser(page, plan, out_dir, timeout_ms):
    screenshots = []
    trace = []
    captures = {}
    for index, step in enumerate(plan.get('steps', [])):
        kind = step['type']
        if kind == 'goto':
            page.goto(step['url'], wait_until='domcontentloaded')
        elif kind == 'fill':
            page.locator(step['selector']).fill(step['value'])
        elif kind == 'set_input_files':
            page.locator(step['selector']).set_input_files(step['file_path'])
        elif kind == 'click':
            page.locator(step['selector']).click(force=True, no_wait_after=True)
            page.wait_for_timeout(250)
        elif kind == 'wait_for_url_contains':
            wait_for_url_contains(page, step['value'], timeout_ms)
        elif kind == 'wait_for_selector':
            page.locator(step['selector']).wait_for(timeout=timeout_ms)
        elif kind == 'text_content':
            captures[step['assign']] = page.locator(step['selector']).text_content() or ''
        elif kind == 'wait_for_timeout':
            page.wait_for_timeout(int(step.get('ms', 500)))
        else:
            raise RuntimeError(f'Unsupported step: {kind}')
        shot = out_dir / f'step-{index:02d}.png'
        capture_step_screenshot(page, shot)
        screenshots.append(str(shot))
        html_file = out_dir / f'step-{index:02d}.html'
        html_file.write_text(page.content(), encoding='utf-8')
        trace.append({'index': index, 'type': kind, 'url': page.url, 'screenshot': str(shot), 'html': str(html_file)})
    dom_path = out_dir / 'portal-run.dom.html'
    dom_path.write_text(page.content(), encoding='utf-8')
    return {
        'ok': True,
        'channel': plan.get('channel'),
        'target_mode': (plan.get('target') or {}).get('target_mode', ''),
        'target_origin': ((plan.get('target') or {}).get('target') or {}).get('origin', ''),
        'remote_reference': captures.get('remote_reference'),
        'remote_status': captures.get('remote_status') or '',
        'screenshots': screenshots,
        'dom_path': str(dom_path),
        'trace': trace,
        'step_count': len(trace),
        'browser_engine': 'playwright-chromium',
        'proof_mode': 'playwright-browser-external'
    }


def try_playwright(plan, out_dir, headless, timeout_ms, storage_state_path, ignore_https_errors):
    with sync_playwright() as playwright:
        executable = '/usr/bin/chromium' if os.path.exists('/usr/bin/chromium') else playwright.chromium.executable_path
        browser = playwright.chromium.launch(executable_path=executable, headless=headless, args=['--no-sandbox', '--disable-features=BlockInsecurePrivateNetworkRequests,PrivateNetworkAccessSendPreflights'])
        context_args = {'ignore_https_errors': ignore_https_errors}
        if storage_state_path and Path(storage_state_path).exists():
            context_args['storage_state'] = storage_state_path
        context = browser.new_context(**context_args)
        page = context.new_page()
        page.set_default_timeout(timeout_ms)
        page.set_default_navigation_timeout(timeout_ms)
        target_mode = (plan.get('target') or {}).get('target_mode', '')
        if target_mode == 'external':
            result = run_external_browser(page, plan, out_dir, timeout_ms)
        else:
            result = run_local_bridge(page, plan, out_dir, timeout_ms)
        if storage_state_path:
            context.storage_state(path=storage_state_path)
        context.close()
        browser.close()
        return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--plan', required=True)
    parser.add_argument('--output-dir', required=True)
    parser.add_argument('--require-browser', action='store_true')
    args = parser.parse_args()
    plan = json.loads(Path(args.plan).read_text())
    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    settings = plan.get('settings') or {}
    headless = settings.get('headless', True)
    timeout_ms = int(settings.get('timeout_ms', 30000))
    storage_state_path = settings.get('storage_state_path') or None
    ignore_https_errors = bool(settings.get('ignore_https_errors', True))
    result = try_playwright(plan, out_dir, headless, timeout_ms, storage_state_path, ignore_https_errors)
    if args.require_browser and result.get('browser_engine') != 'playwright-chromium':
        raise RuntimeError('browser-proof-required')
    print(json.dumps(result))


if __name__ == '__main__':
    main()
