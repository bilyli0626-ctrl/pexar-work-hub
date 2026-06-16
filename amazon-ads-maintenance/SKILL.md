---
name: amazon-ads-maintenance
description: "亚马逊广告数据维护与运营分析。当用户提供亚马逊广告 CSV 报告并要求更新飞书表格、分析广告效果、诊断运营问题时使用。触发场景包括：提到亚马逊广告数据、广告报告 CSV、运营数据维护、广告 ROI 分析、ACOAS 分析、广告效果诊断、飞书运营看板更新，或每周例行数据维护。即使用户只是说'帮我更新下数据'并附带了 CSV 文件，也应触发此 skill。"
---

# 亚马逊广告数据维护与运营分析

本 skill 指导你完成两项核心任务：**数据维护**（CSV → 飞书表格）和**运营分析**（诊断问题 + 给出建议）。

## 前置依赖

- `lark-cli`：用于读写飞书电子表格，路径通常在 `/opt/homebrew/bin/lark-cli`
- 如果遇到权限问题，参考 `lark-shared` skill 完成授权

## 工作流程

### 第一步：读取并解析 CSV

用户会提供一份亚马逊广告报告 CSV。使用 Python 解析：

```python
import csv
with open(csv_path, "r", encoding="utf-8-sig") as f:
    reader = csv.DictReader(f)
```

注意 CSV 使用 UTF-8 BOM 编码（`utf-8-sig`），不要用 `utf-8`，否则首列列名会带有 BOM 字符导致 KeyError。

### 第二步：按周汇总数据

按「周」字段分组，对每周计算以下指标：

| 运营数据表列 | CSV 来源列 | 聚合方式 |
|---|---|---|
| T-Sales（总销售额） | 销售额 | SUM |
| T-units（总销量） | 已售商品数量 | SUM |
| T-orders（总订单数） | 购买量 | SUM |
| AD-spend（广告花费） | 总成本 | SUM |
| AD-Sales（广告销售额） | 归因于点击的销售额 | SUM |
| AD-order（广告订单数） | 归因于点击的购买量 | SUM |
| Click（点击量） | 点击量 | SUM |

汇总后计算公式列：

| 列 | 公式 | 说明 |
|---|---|---|
| ASP | T-Sales / T-units | 客单价，T-units=0 时填 0 |
| ACOAS | AD-spend / T-Sales | 广告成本销售比，T-Sales=0 时填 0 |
| CPC | AD-spend / Click | 单次点击成本，Click=0 时填 0 |
| AD-CVR | AD-order / Click | 广告转化率，Click=0 时填 0 |
| ROI | AD-Sales / AD-spend | 投资回报率，AD-spend=0 时填 0 |
| 广告订单占比 | AD-order / T-orders | T-orders=0 时填 0 |

从每周的日期字段中提取最早和最晚日期，生成周标签格式：`W{周号}（{MM.DD}-{MM.DD}）`

### 第三步：确定写入范围

1. 先获取 wiki 节点的真实 spreadsheet token（如果 URL 是 `/wiki/` 格式）：
   ```bash
   lark-cli wiki spaces get_node --params '{"token":"<wiki_token>"}'
   ```
   从返回的 `node.obj_token` 获取真实 token。

2. 读取现有表格数据，确定最后一行有数据的行号：
   ```bash
   lark-cli sheets +read --spreadsheet-token <token> --range "<sheet_id>!A1:A50"
   ```

3. 对比 CSV 中的周号与表格已有周号：
   - **已存在的周**：检查数据是否有差异，有差异则更新（提醒用户）
   - **新增的周**：追加到表格末尾

### 第四步：写入飞书表格

使用 `lark-cli sheets +write` 写入数据。列顺序为 A-S：

```
A=时间, B=期末库存(留空), C=T-Sales, D=T-units, E=T-orders, F=ASP,
G=T-Sessions(留空), H=T-CVR(留空), I=AD-spend, J=AD-Sales, K=AD-order,
L=ACOAS, M=Click, N=CPC, O=AD-CVR, P=ROI, Q=退货(留空), R=退货原因(留空),
S=广告订单占比
```

B（期末库存）、G（T-Sessions）、H（T-CVR）、Q（退货）、R（退货原因）这些列的数据不在广告 CSV 中，写入时留 null，提醒用户后续手动补充。

百分比字段（ACOAS、AD-CVR、广告订单占比）以百分比字符串格式写入，如 `"16.31%"`。

写入前先 dry-run 预览，确认无误后再执行。

### 第五步：运营分析

数据写入完成后，自动进行运营诊断分析。分析框架详见 [references/analysis-framework.md](references/analysis-framework.md)。

分析输出应包含：
1. **数据总览** — 本次更新的周范围、关键指标变化
2. **趋势判断** — 销量/流量/广告效率的走势
3. **问题诊断** — 分级标注（红色严重/黄色警告）
4. **行动建议** — 按优先级排列，区分短期止血和中长期优化

## 关键飞书表格信息

当前运营看板地址（如果用户没有提供新的链接，默认使用）：
- Wiki URL: `https://rcn8o1s8sbx4.feishu.cn/wiki/CvlOwZn4giIsNFkG3W9c3veFndb`
- Spreadsheet Token: `S6sAsKOGAhXrLwtS34XcRkYCnEe`
- 运营数据 Sheet ID: `WHIVx1`
- 费用 Sheet ID: `Rk4FAs`
- 折扣活动 Sheet ID: `rkdqrr`

## 注意事项

- 货币单位为墨西哥比索（MXN），汇率参考 1 USD ≈ 17.55 MXN
- 产品为 11寸 2K 数码相框（PX110），基于 Frameo 系统
- 每次维护后提醒用户需要手动补充的列（期末库存、T-Sessions 等）
- 如果发现连续多周零成交但仍有广告花费，务必在分析中重点提醒
