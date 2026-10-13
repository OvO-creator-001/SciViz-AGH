# 草稿重连恢复修复（开发包 0.4.1）

作者：B侧助手；日期：2026-10-13。基于 feat/b-research-modes，通过 PR #5 交付供 A 审查；不自行合并。

## 问题与实现

AGH 网页重新打开同一会话后，0.4.0 的内存草稿返回 DRAFT_NOT_FOUND。新增 src/agh/draft-store.mjs，通过 AGH Host fs.read/fs.write 在当前工作区 .sciviz-drafts 保存恢复记录；文件名使用会话与工作区组合的 SHA-256。各次工具操作读取记录，修改后保存；get 只读。不存在记录时新建，权限拒绝或损坏记录明确失败，不回退到其他路径。

修改 package.json 为 0.4.1；更新 learning-tools.mjs 和 tests/b-learning.test.mjs。不新增依赖或权限声明。无 Host 文件接口的离线测试上下文仍使用内存。记录包含输入摘录与分析内容，应保留在用户工作区，不上传 Git；旧 0.4.0 已丢失的内存草稿不能恢复。

## 验证与安装

node --test tests/*.test.mjs：33/33 通过，包括实例重建恢复、会话隔离、Host 写入拒绝、修订后生成与损坏记录报错。

AGH 官方 SDK update 操作 pkg-c1e54ab723ed954d1d9dbccbe9c90273 已 completed。安装来源 file:./work/sciviz-agh-0.4.1-draft-recovery-20261013；integrity sha256-b60d736908ed90ee4b901348a46264ea417982d994b5422a197fad34a43aecbe。确认 version/actualVersion=0.4.1、actual=running、trusted=true、desired=enabled，无 blockers。权限能力差异为空。

回退：使用 AGH 官方 rollback 回到保留的 0.4.0；不覆盖旧快照。

## 限制

安装已确认；尚未在真实 AGH 会话验证新恢复逻辑和 PDF 分析。用户决定自行测试论文并反馈，暂不录制视频。恢复记录是本地分析记录，不是科学真实性或防篡改认证；不可并发修订同一草稿。
