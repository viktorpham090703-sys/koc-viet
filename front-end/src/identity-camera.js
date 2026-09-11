// Photos stay in the onboarding draft; opening the camera never uploads anything.
export function openIdentityCamera({ owner, label, facingMode, onCapture, onFallback }) {
  const trigger = document.activeElement;
  const dialog = document.createElement("dialog");
  dialog.className = "identity-camera";
  dialog.setAttribute("aria-labelledby", "identity-camera-title");
  dialog.innerHTML = `
    <header class="modal-header">
      <h2 id="identity-camera-title" class="modal-title"></h2>
      <button type="button" class="modal-close" data-camera-cancel aria-label="Đóng" title="Đóng">×</button>
    </header>
    <div class="modal-body">
    <p class="muted">${facingMode === "user" ? "Giữ rõ khuôn mặt và CCCD trong ảnh." : "Đặt toàn bộ CCCD trong khung hình, đủ sáng và không bị lóa."}</p>
    <video autoplay playsinline muted aria-label="Hình ảnh từ camera" ${facingMode === "user" ? 'class="identity-camera-mirrored"' : ""}></video>
    <p class="identity-camera-status" role="status">Đang mở camera…</p>
    <div class="identity-photo-actions">
      <button type="button" class="btn primary" data-camera-shoot disabled>Chụp ảnh</button>
      <button type="button" class="btn ghost" data-camera-fallback hidden>Chọn ảnh / Mở camera thiết bị</button>
    </div></div>`;
  dialog.querySelector("h2").textContent = "Chụp " + label;
  const video = dialog.querySelector("video");
  const shoot = dialog.querySelector("[data-camera-shoot]");
  const status = dialog.querySelector('[role="status"]');
  const fallback = dialog.querySelector("[data-camera-fallback]");
  let stream;
  let closed = false;
  const stopStream = () => {
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
    video.srcObject = null;
  };
  const finish = () => {
    if (closed) return;
    closed = true;
    stopStream();
    observer.disconnect();
    window.removeEventListener("pagehide", finish);
    window.removeEventListener("hashchange", finish);
    window.removeEventListener("popstate", finish);
    dialog.close();
    dialog.remove();
    if (trigger?.isConnected) trigger.focus();
  };
  const observer = new MutationObserver(() => {
    if (!owner.isConnected || !dialog.isConnected) finish();
  });
  const fail = () => {
    stopStream();
    shoot.disabled = true;
    shoot.hidden = true;
    video.hidden = true;
    fallback.hidden = false;
    status.textContent = "Không mở được camera. Hãy kiểm tra quyền camera hoặc chọn ảnh / mở camera của thiết bị.";
    fallback.focus();
  };
  dialog.querySelector("[data-camera-cancel]").addEventListener("click", finish);
  dialog.addEventListener("cancel", (event) => { event.preventDefault(); finish(); });
  dialog.addEventListener("close", finish);
  fallback.addEventListener("click", () => { finish(); onFallback(); });
  video.addEventListener("loadeddata", () => {
    if (closed || !video.videoWidth || !video.videoHeight) return;
    shoot.disabled = false;
    status.textContent = "Kiểm tra ảnh rõ nét trước khi chụp.";
  });
  shoot.addEventListener("click", () => {
    if (closed || shoot.disabled || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;
    try {
      const canvas = document.createElement("canvas");
      // Bound the JPEG size while retaining enough detail to read the document.
      const scale = Math.min(1, 1920 / Math.max(video.videoWidth, video.videoHeight));
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      // Never mirror the saved image: text on the CCCD must remain readable.
      canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      finish();
      onCapture(dataUrl);
    } catch {
      status.textContent = "Chưa chụp được ảnh. Vui lòng thử lại.";
    }
  });
  document.body.append(dialog);
  dialog.showModal();
  dialog.querySelector("[data-camera-cancel]").focus();
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("pagehide", finish);
  window.addEventListener("hashchange", finish);
  window.addEventListener("popstate", finish);
  (async () => {
    try {
      const acquired = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      // Permission may resolve after the user has dismissed or left the form.
      if (closed || !owner.isConnected) {
        acquired.getTracks().forEach((track) => track.stop());
        finish();
        return;
      }
      stream = acquired;
      video.srcObject = stream;
      await video.play();
    } catch {
      if (!closed) fail();
    }
  })();
  return finish;
}
