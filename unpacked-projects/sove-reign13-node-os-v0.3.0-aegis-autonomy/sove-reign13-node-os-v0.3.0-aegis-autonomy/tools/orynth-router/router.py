#!/usr/bin/env python3
"""Orynth 7.6 local-first AI router.

Minimal OpenAI-compatible chat endpoint for SoveReign13 Node OS.
It tries local Ollama first and can fall back to an external OpenAI-compatible
provider only when an API key is present and fallback is explicitly requested.
"""
from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Dict, List

HOST = os.getenv("ORYNTH_ROUTER_HOST", "0.0.0.0")
PORT = int(os.getenv("ORYNTH_ROUTER_PORT", "13131"))
LOCAL_BASE_URL = os.getenv("ORYNTH_LOCAL_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
LOCAL_MODEL = os.getenv("ORYNTH_LOCAL_MODEL", "qwen3:8b")
CODER_MODEL = os.getenv("ORYNTH_CODER_MODEL", "deepseek-coder-v2:16b")
SYSTEM_PROMPT_PATH = os.getenv("ORYNTH_SYSTEM_PROMPT_PATH", "/etc/sove-reign13/orynth/ORYNTH_7_6_SYSTEM.md")
EXTERNAL_BASE_URL = os.getenv("ORYNTH_EXTERNAL_BASE_URL", "https://api.openai.com/v1").rstrip("/")
EXTERNAL_MODEL = os.getenv("ORYNTH_EXTERNAL_MODEL", "gpt-4.1-mini")
EXTERNAL_API_KEY = os.getenv("OPENAI_API_KEY", "") or os.getenv("ORYNTH_EXTERNAL_API_KEY", "")
TIMEOUT_SECONDS = float(os.getenv("ORYNTH_TIMEOUT_SECONDS", "120"))


def read_system_prompt() -> str:
    try:
        with open(SYSTEM_PROMPT_PATH, "r", encoding="utf-8") as handle:
            return handle.read().strip()
    except OSError:
        return "You are Orynth 7.6 running inside SoveReign13 Node OS. Be precise, code-grounded, and honest."


def http_json(url: str, payload: Dict[str, Any] | None = None, headers: Dict[str, str] | None = None) -> Dict[str, Any]:
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(url, data=data, headers=headers or {"Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:  # noqa: S310 - local/operator controlled URL
        raw = response.read().decode("utf-8")
        return json.loads(raw) if raw else {}


def choose_model(requested: str | None) -> str:
    if not requested or requested in {"local", "auto", "orynth"}:
        return LOCAL_MODEL
    if requested in {"coder", "code", "local-coder"}:
        return CODER_MODEL
    return requested


def call_ollama(messages: List[Dict[str, str]], model: str) -> str:
    system_prompt = read_system_prompt()
    merged = [{"role": "system", "content": system_prompt}] + messages
    payload = {
        "model": model,
        "messages": merged,
        "stream": False,
        "options": {
            "temperature": 0.2,
            "num_ctx": 8192,
        },
    }
    response = http_json(f"{LOCAL_BASE_URL}/api/chat", payload)
    message = response.get("message", {})
    content = message.get("content", "")
    if not content:
        raise RuntimeError(f"Ollama returned no content for model {model}")
    return content


def call_external(messages: List[Dict[str, str]], model: str | None) -> str:
    if not EXTERNAL_API_KEY:
        raise RuntimeError("No external API key present. Set OPENAI_API_KEY or ORYNTH_EXTERNAL_API_KEY to enable fallback.")
    system_prompt = read_system_prompt()
    payload = {
        "model": model or EXTERNAL_MODEL,
        "messages": [{"role": "system", "content": system_prompt}] + messages,
    }
    response = http_json(
        f"{EXTERNAL_BASE_URL}/chat/completions",
        payload,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {EXTERNAL_API_KEY}"},
    )
    return response["choices"][0]["message"]["content"]


def completion_response(content: str, model: str) -> Dict[str, Any]:
    now = int(time.time())
    return {
        "id": f"chatcmpl-orynth-{now}",
        "object": "chat.completion",
        "created": now,
        "model": model,
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": content},
                "finish_reason": "stop",
            }
        ],
    }


class Handler(BaseHTTPRequestHandler):
    server_version = "OrynthRouter/0.3.0"

    def log_message(self, fmt: str, *args: Any) -> None:
        print(f"{self.address_string()} - {fmt % args}")

    def send_json(self, status: int, payload: Dict[str, Any]) -> None:
        body = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_payload(self) -> Dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length).decode("utf-8") if length else "{}"
        return json.loads(raw or "{}")

    def do_GET(self) -> None:  # noqa: N802 - stdlib naming
        if self.path == "/health":
            ollama_ok = False
            ollama_error = None
            try:
                http_json(f"{LOCAL_BASE_URL}/api/tags")
                ollama_ok = True
            except Exception as exc:  # noqa: BLE001 - health should report any failure
                ollama_error = str(exc)
            self.send_json(
                200,
                {
                    "ok": True,
                    "router": "Orynth 7.6",
                    "local_base_url": LOCAL_BASE_URL,
                    "local_model": LOCAL_MODEL,
                    "coder_model": CODER_MODEL,
                    "ollama_ok": ollama_ok,
                    "ollama_error": ollama_error,
                    "external_fallback_configured": bool(EXTERNAL_API_KEY),
                },
            )
            return
        self.send_json(404, {"error": "not_found"})

    def do_POST(self) -> None:  # noqa: N802 - stdlib naming
        if self.path not in {"/v1/chat/completions", "/chat"}:
            self.send_json(404, {"error": "not_found"})
            return
        try:
            payload = self.read_payload()
            messages = payload.get("messages") or []
            if not isinstance(messages, list):
                raise ValueError("messages must be a list")
            requested_model = payload.get("model")
            fallback = bool(payload.get("fallback", False))
            model = choose_model(requested_model)
            try:
                content = call_ollama(messages, model)
            except Exception as local_exc:  # noqa: BLE001 - returned cleanly to caller
                if not fallback:
                    raise RuntimeError(f"Local model failed and fallback=false: {local_exc}") from local_exc
                content = call_external(messages, payload.get("external_model"))
                model = payload.get("external_model") or EXTERNAL_MODEL
            self.send_json(200, completion_response(content, model))
        except Exception as exc:  # noqa: BLE001 - API endpoint should return JSON errors
            self.send_json(500, {"error": str(exc)})


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Orynth 7.6 router listening on {HOST}:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
