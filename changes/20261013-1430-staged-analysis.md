# v0.4.0 分步分析、联网术语与双模式阅读

- 作者：miku；日期：2026-10-13（Asia/Shanghai）。
- 分支：feat/b-research-modes，基于A开发分支47dd178；PR面向feat/a-core-pipeline，未合并。
- 分类：src核心/AGH/渲染跨模块修改，因用户新P0/P1/P2要求新增共享分析协议；tests、examples、docs、evidence同步交付。

## 行为与实现

新增 start/research/save/get/render 五个AGH工具，模型在工具调用之间处理材料、解释与优化；不增加外部模型API或本地模型。检索仅使用Host公开读取端口，默认Bing关键词摘要，可选Wikipedia和公开正文URL。来源保存真实摘录、URL、检索时间与背景角色，明确搜索摘要尚未读取正文。

新增可选learning字段与集中校验：双版本summary、key_points、terms、配图类型和实际联网状态。原关系图及schema_version=1.0兼容；overview先呈现主旨。模式切换只在离线页面更换已有文字和图示标签。五种教学配图在src/render/teaching.mjs实现，固定程序生成，不执行模型提供的HTML/SVG代码。

草稿最多6个/会话，12次检索和30次修订，revision防止覆盖，来源不可改写；原生重启会丢失未渲染内存草稿，持久输出含content.json和analysis-record.json。流水线增加受限文件名的teaching SVG产物与哈希。新流程默认使用当前AGH cwd；显式根也必须通过Host访问检查，不在拒绝后更换路径。

本次证据目录添加局部.gitattributes，保留生成文件/JSON记录字节，避免Windows换行转换破坏manifest哈希；不改变全仓库换行配置。

## 验证

- `node --test tests/*.test.mjs`：32/32。
- `node examples/learning-v4/generate-demo.mjs`：正常HTML、关系SVG及10份模式配图SVG。
- AGH官方checkToolDef：九个工具定义通过（根目录输出修正不改变schema）。
- 内置浏览器localhost实际检查：双模式鼠标与方向键切换、原节点选择、来源展开通过；无控制台错误。截图见evidence/b-learning-040/overview.png。
- Host公开读取器真实Bing中文检索成功；Wikipedia/DuckDuckGo直连失败，OpenStax被截断。没有绕过网络策略。
- 本机0.4.0安装运行；真实AGH模型成功start和Bing查询，但正文读取及save返回APPROVAL_REJECTED，故未运行原生render/revision2，不算完整端到端通过。路径问题据此补成当前cwd输出，并做聚合回归测试；未重试拒绝操作。

完整结果、具体产物与待验收项见[evidence/b-learning-040/RESULTS.md](../evidence/b-learning-040/RESULTS.md)。

## 风险、迁移与回退

旧JSON/旧工具继续工作，新功能通过五个新工具及learning使用。无需新增依赖/框架。默认联网增加公开查询行为，query只发短术语；网络正文仍是不可信资料，模型要核对引用相关性，生成不验证科学主张。

Bing HTML可能改变；动态页面、公式、长正文抓取可能不完整。模板配图不等同于真实分子/几何或专业科研插图。AGH当前模型可能收费，不声称所有推理免费。

代码回退通过Git新提交或切回旧版本；安装使用新快照，不覆盖旧文件。AGH管理器只保留有界的上一版本回滚槽；0.3.1来源目录仍保留，可经官方更新流程恢复。未修改main、未合并其他PR、未改变模型配置或审批规则。视频仍是脚本与检查单，未完成正式录制。
