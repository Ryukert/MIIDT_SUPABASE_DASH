export function wireBasicControls({
  ui,
  onPause,
  onClear,
  onExport,
  onSimToggle,
  onWinChange,
  onDecChange,
  onBaselineSet,
  onBaselineClear
}) {
  ui.pauseBtn.addEventListener("click", onPause);
  ui.clearBtn.addEventListener("click", onClear);
  ui.exportBtn.addEventListener("click", onExport);
  ui.simBtn.addEventListener("click", onSimToggle);

  ui.winSel.addEventListener("change", () => onWinChange(Number(ui.winSel.value || 400)));
  ui.decSel.addEventListener("change", () => onDecChange(Number(ui.decSel.value || 1)));

  ui.btnSetBaseline.addEventListener("click", onBaselineSet);
  ui.btnClearBaseline.addEventListener("click", onBaselineClear);
}
