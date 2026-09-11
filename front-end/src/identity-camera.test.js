import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("./identity-camera.js", import.meta.url), "utf8");
const flush = () => new Promise((resolve) => setImmediate(resolve));

function setup(getUserMedia) {
  class Element extends EventTarget {
    isConnected = true;
    disabled = false;
    focus() { this.focused = true; }
    setAttribute() {}
    showModal() { this.open = true; }
    close() { this.open = false; this.dispatchEvent(new Event("close")); }
    remove() { this.isConnected = false; }
    getBoundingClientRect() { return { left: 10, right: 100, top: 10, bottom: 100 }; }
  }
  const controls = Object.fromEntries(["h2", "video", "[data-camera-shoot]", '[role="status"]', "[data-camera-fallback]", "[data-camera-cancel]"].map((key) => [key, new Element()]));
  controls["[data-camera-shoot]"].disabled = true;
  const video = controls.video;
  video.play = async () => {};
  video.videoWidth = 0;
  video.videoHeight = 0;
  video.readyState = 0;
  const dialog = new Element();
  dialog.querySelector = (selector) => controls[selector];
  const drawCalls = [];
  const canvas = {
    getContext: () => ({ drawImage: (...args) => drawCalls.push(args) }),
    toDataURL: () => "data:image/jpeg;base64,TEST",
  };
  const owner = new Element();
  const trigger = new Element();
  let observer;
  const window = new EventTarget();
  const open = vm.runInNewContext(source.replace("export function", "function") + "\nopenIdentityCamera;", {
    document: { activeElement: trigger, body: { append() {} }, createElement: (tag) => tag === "dialog" ? dialog : canvas },
    navigator: { mediaDevices: getUserMedia ? { getUserMedia } : undefined },
    MutationObserver: class {
      constructor(callback) { observer = this; this.callback = callback; }
      observe() {}
      disconnect() { this.disconnected = true; }
    },
    window,
  });
  const captured = [];
  let fallbacks = 0;
  const close = open({ owner, label: "CCCD mặt trước", facingMode: "environment", onCapture: (data) => captured.push(data), onFallback: () => fallbacks++ });
  const click = (selector) => controls[selector].dispatchEvent(new Event("click"));
  return { controls, dialog, video, canvas, drawCalls, captured, owner, trigger, window, close, click, observer, fallbacks: () => fallbacks };
}

function camera() {
  const track = { stops: 0, stop() { this.stops++; } };
  return { track, stream: { getTracks: () => [track] } };
}

test("waits for a frame, requests rear camera without audio, saves unmirrored JPEG and releases camera", async () => {
  const { track, stream } = camera();
  let constraints;
  const ui = setup(async (value) => { constraints = value; return stream; });
  await flush();
  ui.click("[data-camera-shoot]");
  assert.equal(ui.captured.length, 0);
  assert.equal(constraints.video.facingMode.ideal, "environment");
  assert.equal(constraints.audio, false);
  Object.assign(ui.video, { videoWidth: 3840, videoHeight: 2160, readyState: 2 });
  ui.video.dispatchEvent(new Event("loadeddata"));
  ui.click("[data-camera-shoot]");
  assert.deepEqual(ui.captured, ["data:image/jpeg;base64,TEST"]);
  assert.equal(ui.canvas.width, 1920);
  assert.equal(ui.canvas.height, 1080);
  // The canvas context intentionally has no mirror/transform methods.
  assert.equal(ui.drawCalls.length, 1);
  assert.equal(track.stops, 1);
  assert.equal(ui.dialog.isConnected, false);
  assert.equal(ui.trigger.focused, true);
});

test("late permission resolution after cancel immediately stops the acquired stream", async () => {
  const { track, stream } = camera();
  let resolve;
  const ui = setup(() => new Promise((done) => { resolve = done; }));
  ui.click("[data-camera-cancel]");
  resolve(stream);
  await flush();
  assert.equal(track.stops, 1);
  assert.equal(ui.video.srcObject, null);
  assert.equal(ui.captured.length, 0);
});

test("clicking outside keeps the camera open until explicitly closed", async () => {
  const { track, stream } = camera();
  const ui = setup(async () => stream);
  await flush();
  const event = new Event("click");
  Object.assign(event, { clientX: 0, clientY: 0 });
  ui.dialog.dispatchEvent(event);
  assert.equal(ui.dialog.open, true);
  assert.equal(track.stops, 0);
  ui.click("[data-camera-cancel]");
  assert.equal(ui.dialog.open, false);
  assert.equal(track.stops, 1);
});

for (const dismissal of ["cancel", "escape", "route", "pagehide", "owner-removed", "modal-removed"]) {
  test(`releases camera on ${dismissal}`, async () => {
    const { track, stream } = camera();
    const ui = setup(async () => stream);
    await flush();
    if (dismissal === "cancel") ui.click("[data-camera-cancel]");
    if (dismissal === "escape") ui.dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
    if (dismissal === "route") ui.window.dispatchEvent(new Event("hashchange"));
    if (dismissal === "pagehide") ui.window.dispatchEvent(new Event("pagehide"));
    if (dismissal === "owner-removed") { ui.owner.isConnected = false; ui.observer.callback(); }
    if (dismissal === "modal-removed") { ui.dialog.isConnected = false; ui.observer.callback(); }
    ui.close();
    assert.equal(track.stops, 1);
    assert.equal(ui.observer.disconnected, true);
    assert.equal(ui.captured.length, 0);
  });
}

for (const reason of ["denied", "unsupported"]) {
  test(`${reason} camera offers fallback only after user chooses it`, async () => {
    const ui = setup(reason === "denied" ? async () => { throw new Error("NotAllowedError"); } : null);
    await flush();
    assert.equal(ui.controls["[data-camera-fallback]"].hidden, false);
    assert.equal(ui.controls["[data-camera-shoot]"].hidden, true);
    assert.equal(ui.fallbacks(), 0);
    ui.click("[data-camera-fallback]");
    assert.equal(ui.fallbacks(), 1);
    assert.equal(ui.dialog.isConnected, false);
  });
}
