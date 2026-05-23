(function () {
  if (!window.DOMPurify) {
    window.DOMPurify = {
      sanitize(value) {
        return String(value || "");
      },
    };
  }

  if (!window.lucide) {
    window.lucide = {
      createIcons() {},
    };
  }

  if (!window.JSZip) {
    window.JSZip = class SkyeDocxMaxZipFallback {
      constructor() {
        this.files = new Map();
      }

      folder(prefix) {
        const normalized = String(prefix || "").replace(/\/+$/g, "");
        return {
          file: (childPath, content) => {
            this.file(`${normalized}/${childPath}`, content);
            return this;
          },
        };
      }

      file(path, content) {
        if (typeof content === "undefined") {
          const stored = this.files.get(path);
          if (!stored) return null;
          return {
            async: async (type = "string") => {
              if (type === "blob") return stored.blob;
              if (type === "string") return await stored.blob.text();
              if (type === "uint8array") return new Uint8Array(await stored.blob.arrayBuffer());
              return stored.blob;
            },
          };
        }
        const blob = content instanceof Blob ? content : new Blob([String(content || "")], { type: "text/plain;charset=utf-8" });
        this.files.set(path, { path, blob });
        return this;
      }

      async generateAsync() {
        const manifest = {
          app_id: "SkyeDocxMax",
          fallback_zip: true,
          generated_at: new Date().toISOString(),
          files: await Promise.all(Array.from(this.files.values()).map(async (file) => ({
            path: file.path,
            type: file.blob.type || "application/octet-stream",
            data_base64: btoa(String.fromCharCode(...new Uint8Array(await file.blob.arrayBuffer()))),
          }))),
        };
        const body = [
          "SkyeDocxMax fallback export package",
          "",
          JSON.stringify(manifest, null, 2),
          "",
        ].join("\n");
        return new Blob([body], { type: "text/plain;charset=utf-8" });
      }

      static async loadAsync(blob) {
        const text = await blob.text();
        const marker = "SkyeDocxMax fallback export package\n\n";
        if (!text.startsWith(marker)) throw new Error("Unsupported fallback archive format.");
        const manifestText = text.slice(marker.length).trim();
        const manifest = JSON.parse(manifestText);
        if (!manifest?.fallback_zip || !Array.isArray(manifest.files)) {
          throw new Error("Invalid fallback archive manifest.");
        }
        const archive = new window.JSZip();
        for (const file of manifest.files) {
          const binary = atob(String(file.data_base64 || ""));
          const bytes = new Uint8Array(binary.length);
          for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
          archive.file(file.path, new Blob([bytes], { type: file.type || "application/octet-stream" }));
        }
        return archive;
      }
    };
  }

  if (window.Quill) return;

  class FallbackQuill {
    constructor(selector) {
      const host = typeof selector === "string" ? document.querySelector(selector) : selector;
      if (!host) throw new Error("Editor container was not found.");
      host.innerHTML = "";
      const editor = document.createElement("div");
      editor.className = "ql-editor skye-fallback-editor";
      editor.contentEditable = "true";
      editor.spellcheck = true;
      editor.innerHTML = "<p><br></p>";
      host.appendChild(editor);
      this.root = editor;
      this.handlers = {};
      this.clipboard = {
        dangerouslyPasteHTML: (...args) => {
          const html = args.length > 1 ? args[1] : args[0];
          this.root.innerHTML = String(html || "");
          this.emit("text-change", {}, {}, "api");
        },
      };
      this.history = { clear() {} };
      this.root.addEventListener("input", () => this.emit("text-change", {}, {}, "user"));
    }

    on(eventName, handler) {
      if (!this.handlers[eventName]) this.handlers[eventName] = [];
      this.handlers[eventName].push(handler);
    }

    emit(eventName, ...args) {
      for (const handler of this.handlers[eventName] || []) handler(...args);
    }

    getText(index = 0, length) {
      const text = this.root.innerText || "";
      return typeof length === "number" ? text.slice(index, index + length) : text.slice(index);
    }

    getLength() {
      return this.getText().length;
    }

    getSelection() {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || !this.root.contains(selection.anchorNode)) {
        return { index: this.getLength(), length: 0 };
      }
      return { index: 0, length: String(selection.toString() || "").length };
    }

    setSelection() {}

    focus() {
      this.root.focus();
    }

    format(command, value) {
      try {
        document.execCommand(command, false, value);
      } catch {}
    }

    formatText() {}

    getFormat() {
      return {};
    }

    insertText(index, text) {
      this.root.textContent = `${this.getText(0, index)}${text}${this.getText(index)}`;
      this.emit("text-change", {}, {}, "api");
    }

    deleteText(index, length) {
      const text = this.getText();
      this.root.textContent = `${text.slice(0, index)}${text.slice(index + length)}`;
      this.emit("text-change", {}, {}, "api");
    }

    insertEmbed(_index, type, value) {
      if (type === "image") {
        const image = document.createElement("img");
        image.src = value;
        image.alt = "";
        this.root.appendChild(image);
        this.emit("text-change", {}, {}, "api");
      }
    }

    getModule() {
      return {
        addHandler() {},
      };
    }
  }

  window.Quill = FallbackQuill;
})();
