(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const dialog = $("score-entry-dialog");
  if (!dialog) return;
  const MAX_FILE = 20 * 1024 * 1024, MAX_TOTAL = 40 * 1024 * 1024;
  let files = [], busy = false, database;
  const urls = new Set();
  function message(text, error = false) {
    $("score-entry-status").textContent = text;
    $("score-entry-status").classList.toggle("error", error);
  }
  function db() {
    if (!window.indexedDB) return Promise.reject(new Error("浏览器不允许保存草稿，请退出无痕模式或检查存储权限。"));
    if (!database) database = new Promise((resolve, reject) => {
      const request = indexedDB.open("tuner-score-drafts-v1", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("drafts");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error("无法打开本机草稿存储。"));
      request.onblocked = () => reject(new Error("请关闭其他弦音页面后重试。"));
    }).catch(error => { database = null; throw error; });
    return database;
  }
  async function read() {
    const database = await db();
    return new Promise((resolve, reject) => {
      const request = database.transaction("drafts").objectStore("drafts").get("current");
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error("无法读取本机草稿。"));
    });
  }
  async function save(next) {
    const database = await db();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction("drafts", "readwrite");
      transaction.objectStore("drafts").put(next, "current");
      transaction.oncomplete = resolve;
      transaction.onerror = transaction.onabort = () => reject(new Error("草稿保存失败，可能是浏览器存储空间不足；本次文件尚未保存。"));
    });
    files = next;
    render();
  }
  function releaseUrls() { for (const url of urls) URL.revokeObjectURL(url); urls.clear(); }
  function render() {
    releaseUrls();
    $("score-entry-files").replaceChildren(...files.map((file, index) => {
      const row = document.createElement("li"); row.className = "score-draft";
      const thumbnail = document.createElement(file.type === "application/pdf" ? "span" : "img");
      if (file.type === "application/pdf") { thumbnail.className = "pdf-badge"; thumbnail.textContent = "PDF"; }
      else { const url = URL.createObjectURL(file.blob); urls.add(url); thumbnail.src = url; thumbnail.alt = `原稿 ${index + 1}`; }
      const info = document.createElement("div"), title = document.createElement("strong"), detail = document.createElement("small");
      title.textContent = `${index + 1}. ${file.name}`;
      detail.textContent = `${(file.blob.size / 1024 / 1024).toFixed(1)} MB · 待识别 · 仅在本机`;
      const actions = document.createElement("div"); actions.className = "score-draft-actions";
      for (const [label, action, disabled] of [
        ["上移", () => move(index, -1), index === 0],
        ["下移", () => move(index, 1), index === files.length - 1],
        ["移除", () => save(files.filter((_, item) => item !== index)), false]
      ]) {
        const button = document.createElement("button"); button.type = "button"; button.textContent = label;
        button.disabled = busy || disabled; button.setAttribute("aria-label", `${label} ${file.name}`);
        button.addEventListener("click", () => run(action)); actions.append(button);
      }
      info.append(title, detail, actions); row.append(thumbnail, info); return row;
    }));
    for (const id of ["score-camera-button", "score-files-button"]) $(id).disabled = busy;
    $("score-entry-clear").disabled = busy || !files.length;
    if (!dialog.open) releaseUrls();
  }
  async function run(action) {
    if (busy) return;
    busy = true; render();
    try { await action(); message("原稿已保存在本机临时草稿，尚未上传或识别。"); }
    catch (error) { message(error.message || "操作失败，请重试。", true); }
    finally { busy = false; render(); }
  }
  async function move(index, direction) {
    const next = [...files]; [next[index], next[index + direction]] = [next[index + direction], next[index]];
    await save(next);
  }
  async function fileType(file) {
    const data = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return "image/jpeg";
    if ([137,80,78,71,13,10,26,10].every((value, index) => data[index] === value)) return "image/png";
    const text = String.fromCharCode(...data);
    if (text.startsWith("RIFF") && text.slice(8) === "WEBP") return "image/webp";
    if (text.startsWith("%PDF-")) return "application/pdf";
    throw new Error(`${file.name} 不是支持的图片或 PDF。HEIC 请先导出为 JPG；改文件后缀无法转换格式。`);
  }
  async function add(selected) {
    if (!selected.length) return;
    if (files.length + selected.length > 10) throw new Error("最多保留 10 个文件，请先移除不需要的原稿。");
    if (selected.some(file => !file.size || file.size > MAX_FILE)) throw new Error("文件不能为空，单个文件不能超过 20 MB。");
    if ([...files.map(file => file.blob), ...selected].reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL) throw new Error("草稿总大小不能超过 40 MB，请减少文件或压缩图片。");
    const added = await Promise.all(selected.map(async file => {
      const type = await fileType(file);
      return {name: file.name, type, blob: file.slice(0, file.size, type)};
    }));
    await save([...files, ...added]);
  }
  $("score-entry-open").addEventListener("click", async () => {
    dialog.showModal(); message("正在读取本机草稿…");
    await run(async () => { files = await read(); });
    if (!files.length && !$("score-entry-status").classList.contains("error")) message("可以拍照或选择文件。识谱服务尚未接入，文件不会上传。");
  });
  $("score-entry-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", releaseUrls);
  for (const [button, input] of [["score-camera-button", "score-camera-input"], ["score-files-button", "score-files-input"]]) {
    $(button).addEventListener("click", () => $(input).click());
    $(input).addEventListener("change", event => {
      const selected = Array.from(event.target.files || []); event.target.value = "";
      if (selected.length) void run(() => add(selected));
    });
  }
  $("score-entry-clear").addEventListener("click", () => {
    if (window.confirm("清空这份本机临时草稿？不会删除手机相册或文件里的原件。")) void run(async () => { await save([]); });
  });
  // Shared validation also keeps future recognizer adapters from trusting file extensions.
  window.scoreEntry = {fileType};
})();
