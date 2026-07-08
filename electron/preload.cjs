const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("mochiDesktop", {
  getWindowBounds: () => ipcRenderer.invoke("mochi:get-window-bounds"),
  moveWindow: (x, y) => ipcRenderer.send("mochi:move-window", { x, y }),
  setExpanded: (expanded) => ipcRenderer.send("mochi:set-expanded", expanded),
  quit: () => ipcRenderer.send("mochi:quit"),
});
