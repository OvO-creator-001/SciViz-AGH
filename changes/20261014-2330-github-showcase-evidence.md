# GitHub 项目截图归档

## Summary

归档团队提供的 GitHub 仓库原始截图及平台、链接、内容和日期说明；同步桌面赛事材料，不创建 ZIP。

## Technical implementation

截图按原始字节复制到 docs/product/public-content/20261014 和桌面 07_项目展示；SHA-256 校验一致。更新桌面 SHA256SUMS.txt，不修改插件业务代码或私人运行日志。

## Interfaces, configuration, and data

新增项目展示证据与根目录更新索引，无 API 或配置变化。

## Compatibility and migration

既有代码与安装包不变；原项目展示文案保留，追加截图入口。

## Verification

人工检查截图，GitHub 查询确认当前 PRIVATE；不编造公开发布日期。复制后校验图片哈希及提交目录完整性清单。

## Risks and limitations

截图为私有仓库历史 main 页面，不能证明公开发布或成品合入 main。团队需在公开后补充无登录访问截图与实际公开日期。

## Rollback

本次新增文件可按提交回退；不覆盖既有发布包，不删除原图。
