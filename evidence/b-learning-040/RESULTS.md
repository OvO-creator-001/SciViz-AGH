# v0.4.0 B侧实际验证

日期：2026-10-13；Windows、Node.js v24.21.0。以下区分代码测试、浏览器、公开网络和原生AGH，不相互替代。

## 已通过

1. `node --test tests/*.test.mjs`：32项通过。覆盖双模式与所有教学SVG、引用/结构校验、恶意文本转义、HTTP错误/超限/取消、网络不可用时报告、草稿隔离/不可改写来源/修订冲突、两次新产物不覆盖旧产物、当前工作目录选择与Host拒绝。
2. `node examples/learning-v4/generate-demo.mjs`：最终示例在 `../sciviz-hnPKjK/interactive.html`，关系SVG和10份独立教学SVG位于同目录。示例是原创合成教学内容，明确标记“未联网”，不冒充真实论文。
3. AGH现有源码导出的checkToolDef校验九个工具，全部ok；未新增运行时依赖。
4. Codex内置浏览器通过本机127.0.0.1静态预览检查最终HTML：点击学术模式，按左方向键回到科普；可见文本正确切换；点击“建立教学示意”，详情状态改变；点击来源后对应details.open=true。控制台错误为空。截图overview.png。没有声称全浏览器矩阵、物理断网或手机截图测试。
5. 直接复用AGH Host createPublicFetch作真实网络探针：Bing中文“简谐运动”返回三个带URL的搜索摘要。源记录见public-search.json；标题/时间/URL保留，标注未读取正文。

## 原生AGH：部分通过，完整联调被拒绝

在现有AGH中启用0.4.0，真实模型会话：

`agnes:local:local-dev:cli:workspace:120002bcb12162e1`

- seq125调用start_sciviz_analysis，129成功返回草稿revision0。
- seq143调用research_sciviz_term，147真实取得Bing背景摘要。
- seq161读取百度百科正文；165审批决定rejected/user_rejected，166返回APPROVAL_REJECTED。
- seq179保存分析草稿；183审批决定rejected/user_rejected，184返回APPROVAL_REJECTED。
- 因此没有原生成功save、render或revision2。未在拒绝后重试、未更改审批规则。CLI正常结束并不表示任务生成成功。
- 初始测试cwd位于独立子目录，显式仓库路径超出该会话访问范围。新流程现已改为当前cwd默认输出，并用测试验证拒绝后不更换根。旧工具仍保持原仓库绑定接口。

native-tools.jsonl仅保留该合成材料会话的工具/审批与轮次事件；原seq、origin等不改写，不包含模型思维链。估计credits used=0.012258（AGH报告estimated，并非现金账单）。本次不使用旧三工具顺序核验器来假称新流程完全通过。

## 安装

最终安装快照：`D:\Apps\agh\work\sciviz-agh-0.4.0-research-20261013-cwd`。

最终预检integrity：`sha256-2def78c99eedc572ee9fe44cb36182dbe83b8a2009014450d2691b5f61fbd10a`。实际更新状态记录于installed.json。0.3.1及本次首个0.4.0目录均保留，不覆盖。

## 已知环境限制与剩余验收

- Wikipedia与DuckDuckGo探针返回WEB_NETWORK_ERROR；未安装新代理或绕过AGH网络策略。Wikipedia保留可选，不承诺本机可用。
- OpenStax返回200但Host截断，摘录只有导航及少量文字；不能说已经读完教材或完成权威背景核实。
- 需要用户在AGH中允许对应操作后，继续真实PDF和两次模型修订生成验收，估计30–60分钟，不承诺固定AI提速。当前代码的两次修订/渲染只通过离线工具集成测试。
- 复杂图像生成、真实蛋白质结构、专有几何重建、自动科学核验未实现。现有SVG明确说明模型范围。
- 3分钟视频脚本与检查单已在QUICKSTART_040提供；官方时长/格式待用户提供规则，正式录制未完成。
