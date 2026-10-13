// Explicit, bounded teaching templates. These are not reconstructions of paper figures.
const line = (x1, y1, x2, y2, color = '#637d98') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}"/>`
const label = (x, y, text, size = 20) => `<text x="${x}" y="${y}" fill="#bfcfe1" font-size="${size}" text-anchor="middle">${text}</text>`
const curve = (fn, left, top, width, scale) => Array.from({ length: 161 }, (_, i) => `${(left + i * width / 160).toFixed(2)},${(top - fn(i / 160) * scale).toFixed(2)}`).join(' ')
export const teachingCaptions = {
  topology: ['闭合曲线的连续变形示意；不切断或粘接。仅展示一种拓扑直觉，不代表任意空间的拓扑分类。', '像把橡皮圈慢慢拉长：外形变了，圈还是连着的。剪断再接起来不属于这里的玩法。'],
  fractal: ['Sierpiński 三角形的有限迭代近似。每步保留三个 1/2 尺度副本；理想极限的相似维数 log(3)/log(2) ≈ 1.585。', '把三角形中间挖掉，再对三个小三角形重复：放大看，能找到相似的小图案。屏幕只能画有限步。'],
  quantum_wave: ['无量纲一维高斯波包 ψ(ξ)=π⁻¹/⁴exp(−ξ²/2)exp(i3ξ)。右图为归一化概率密度 |ψ|²=π⁻¹/²exp(−ξ²)，不是粒子轨迹；未模拟时间演化。', '左边像波纹，右边像“更容易在哪里发现粒子”的地图。地图高的地方更容易找到；它不是小球走过的路线。'],
  harmonic_motion: ['理想简谐运动 x/A=cos(ωt)，且加速度 a=−ω²x。仅展示一个周期的无量纲位移；不包含阻尼或外力。', '想象一块弹簧上的小积木来回运动。曲线记录它离中间有多远；这里忽略摩擦，只看一次往返。'],
  protein_structure: ['蛋白质结构层级概念示意：氨基酸序列、局部二级结构、整体三级结构。无真实序列、原子坐标或 PDB 数据，不是特定蛋白质预测；未展示四级结构。', '像一串珠子先卷成小段，再折成整体形状。珠子比喻氨基酸；真实蛋白质更复杂，这张图不能告诉你某种蛋白质的真实形状。'],
}

export function renderTeaching(kind, mode = 'academic') {
  if (kind === 'none') return ''
  const popular = mode === 'popular', ink = popular ? '#ffd17d' : '#69ded1'
  let body = ''
  if (kind === 'topology') {
    body = `<circle cx="175" cy="128" r="70" fill="none" stroke="${ink}" stroke-width="7"/><path d="M490 125 C460 32 665 38 696 111 C731 194 498 228 490 125Z" fill="none" stroke="${ink}" stroke-width="7"/>${line(300, 125, 430, 125)}${label(365, 111, '连续变形 →')}${label(175, 232, popular ? '一根橡皮圈' : '闭合曲线')}${label(602, 232, popular ? '拉长，仍然连着' : '保持连通，不切断或粘接')}`
  } else if (kind === 'fractal') {
    function triangle(x, y, size, depth) {
      const h = size * Math.sqrt(3) / 2
      if (!depth) return `<polygon points="${x},${y} ${x-size/2},${y+h} ${x+size/2},${y+h}" fill="${ink}"/>`
      return triangle(x, y, size/2, depth-1) + triangle(x-size/4,y+h/2,size/2,depth-1) + triangle(x+size/4,y+h/2,size/2,depth-1)
    }
    body = [0, 1, 2, 3].map((d, i) => triangle(110+i*200, 48, 155, d) + label(110+i*200, 227, `第 ${d} 步`)).join('')
  } else if (kind === 'quantum_wave') {
    const amp = Math.pow(Math.PI,-.25), density = 1 / Math.sqrt(Math.PI)
    body = line(55,137,378,137) + line(440,205,770,205)
      + `<polyline points="${curve(t => { const x=t*8-4; return amp*Math.exp(-x*x/2)*Math.cos(3*x) },55,137,320,95)}" fill="none" stroke="${ink}" stroke-width="3"/>
      <polyline points="${curve(t => density*Math.exp(-((t*8-4)**2)),440,205,330,235)}" fill="none" stroke="#98b4ff" stroke-width="3"/>`
      + label(214,38,popular?'波的形状（实部）':'Re ψ(ξ)') + label(604,38,popular?'发现位置的概率密度':'|ψ(ξ)|²；曲线下面积 = 1')
      + label(214,240,'−4       无量纲位置 ξ       4') + label(604,240,'−4       无量纲位置 ξ       4')
  } else if (kind === 'harmonic_motion') {
    body = line(90,132,750,132) + line(90,43,90,220)
      + `<polyline points="${curve(t=>Math.cos(t*2*Math.PI),90,132,660,74)}" fill="none" stroke="${ink}" stroke-width="3"/>`
      + label(58,60,'+1') + label(58,138,'0') + label(58,211,'−1') + label(60,27,popular?'离中间多远':'x/A')
      + [0,1,2,3,4].map(i=>label(90+i*165,239,['0','π/2','π','3π/2','2π'][i])).join('') + label(674,27,popular?'一次往返':'相位 ωt')
  } else if (kind === 'protein_structure') {
    body = Array.from({length:7},(_,i)=>`${i?line(45+(i-1)*27,125,45+i*27,125):''}<circle cx="${45+i*27}" cy="125" r="9" fill="${ink}"/>`).join('')
      + `<polyline points="${curve(t=>Math.sin(t*6*Math.PI),303,125,185,45)}" fill="none" stroke="${ink}" stroke-width="7"/>
      <path d="M592 95 C701 4 773 143 653 167 C539 208 582 49 715 83 C787 97 696 223 622 160 C574 125 637 83 722 149" fill="none" stroke="${ink}" stroke-width="8"/>`
      + label(128,235,popular?'珠子的排列':'一级：氨基酸序列') + label(395,235,popular?'局部卷曲':'二级：局部构象示意') + label(673,235,popular?'折成整体':'三级：整体折叠示意')
  } else throw new Error('Unsupported teaching illustration')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 820 270" role="img" aria-label="${kind} 教学示意"><title>${kind} · ${popular ? '科普' : '学术'}教学示意</title><rect width="820" height="270" rx="12" fill="#0b1321"/><g font-family="Segoe UI,Microsoft YaHei,sans-serif">${body}</g></svg>`
}
