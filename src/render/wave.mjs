// Unit-amplitude, same-frequency linear waves: illustrative displacement, not data.
export function wavePoints(phaseDegrees, mode) {
  const phase = phaseDegrees * Math.PI / 180
  return Array.from({ length: 161 }, (_, i) => {
    const x = i / 160 * Math.PI * 4
    const value = mode === 'a' ? Math.sin(x) : mode === 'b' ? Math.sin(x + phase) : Math.sin(x) + Math.sin(x + phase)
    return `${(24 + i / 160 * 238).toFixed(2)},${(154 - value * 35).toFixed(2)}`
  }).join(' ')
}

export function renderWave(figure) {
  const phase = figure.phase_degrees
  const panels = [
    { x: 26, ink: '#66d9cf', mode: 'a', title: '01 / 波 A', formula: 'y₁ = sin(x)' },
    { x: 367, ink: '#efc778', mode: 'b', title: '02 / 波 B', formula: 'y₂ = sin(x + φ)' },
    { x: 708, ink: '#b3a0f3', mode: 'sum', title: '03 / 叠加结果', formula: 'y = y₁ + y₂' },
  ]
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1020 296" width="1020" height="296" role="img" aria-label="同频等振幅的两列波叠加，显示相位差对合成位移的影响" font-family="Segoe UI, Microsoft YaHei, sans-serif"><rect width="1020" height="296" rx="14" fill="#0a101a"/>${panels.map(p => `<g transform="translate(${p.x} 0)"><text x="24" y="38" fill="${p.ink}" font-size="12" letter-spacing="1">${p.title}</text><text x="24" y="69" fill="#e4ecf7" font-size="22" font-family="Georgia,serif">${p.formula}</text><path d="M 24 82 V 229 M 24 154 H 269" fill="none" stroke="#3c4e64" stroke-width="1"/><path d="M 24 119 H 262 M 24 189 H 262" stroke="#253246" stroke-dasharray="3 5"/><text x="2" y="158" fill="#8ca0b8" font-size="10">0</text><text x="263" y="171" fill="#8ca0b8" font-size="11">x</text><polyline data-wave="${p.mode}" points="${wavePoints(phase, p.mode)}" fill="none" stroke="${p.ink}" stroke-width="2.7" stroke-linejoin="round"/><text x="24" y="267" fill="#98abc3" font-size="12">${p.mode === 'a' ? '相位基准 · 单位振幅' : p.mode === 'b' ? '改变相位，观察波峰相对位置' : '同一坐标相加 · 纵轴比例相同'}</text></g>`).join('')}<text x="330" y="161" fill="#7690b0" font-size="26" text-anchor="middle">+</text><text x="671" y="161" fill="#7690b0" font-size="26" text-anchor="middle">=</text></svg>`
}
