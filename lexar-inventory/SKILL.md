---
name: lexar-inventory
description: "Lexar 客户进销存周报数据处理与上传。当用户提到更新进销存、上传库存、上传销售数据、处理 Lexar 数据、进销存周报、刷新库存、导入库存、导入销售、bedrock 上传等意图时触发。即使用户只是简单说'更新一下数据'或'帮我上传'，只要上下文涉及 Lexar/客户进销存/bedrock，也应触发此 skill。"
---

# Lexar 客户进销存周报处理与上传

处理飞书数据源中的库存和销售数据，生成符合 bedrock 网站要求的 Excel 文件，并通过浏览器上传。

## 工作流程

触发后直接全流程执行，不要中途停下来等待用户确认或回复。按顺序执行以下四个步骤，一气呵成完成。

### 步骤 1：数据处理

运行处理脚本，从飞书读取数据并生成上传文件：

```bash
python3 "/Users/Zhuanz/Documents/lexar进销存/process_weekly.py" process
```

脚本做了什么：
- 从飞书电子表格读取当周 STOCK sheet（命名格式 `STOCK-MMDD`），按仓库规则汇总库存
- 读取 sale sheet（sheet_id=ULyVmO），剔除 Customer 含 Amazon 的记录
- 输出两个文件到 `/Users/Zhuanz/Documents/lexar进销存/weekly_upload/`：
  - `customer_inventory_upload.xlsx` — 库存上传文件
  - `sales_upload_full.xlsx` — 全量非亚马逊销售数据

解析返回的 JSON，记录 SKU 数量、销售记录数、日期范围，直接继续下一步。

如果脚本报错（找不到 STOCK sheet 等），告知用户并终止流程。

### 步骤 2：上传库存数据

需要浏览器操作。用户调用此 skill 时默认已登录网站。

上传流程：
1. 使用 Chrome MCP 工具（`mcp__Claude_in_Chrome__*`），先 `tabs_context_mcp` 获取 tab，然后导航到 `https://bedrock.pexar.us/warroom/dashboard/customer`
2. 在客户进销存看板页面，点击**"导入库存"**按钮
3. 弹出"导入SKU库存"对话框后，找到文件上传 input 元素
4. 使用 `file_upload` 工具上传 `/Users/Zhuanz/Documents/lexar进销存/weekly_upload/customer_inventory_upload.xlsx`
5. 点击**"确认导入"**按钮
6. 截图确认上传成功

> 库存导入会**替换**现有库存快照，这是预期行为。

### 步骤 3：上传销售数据

分两步：先确定截止日期，再上传过滤后的数据。

**3a. 查看网站最新发货日期**

1. 在网站上点击**"销售订单明细"** tab
2. 截图查看第一行数据的发货日期（页面默认按日期降序排列，第一行即为最新日期）
3. 记录最新日期，格式如 `2026/5/28`

**3b. 过滤并生成上传文件**

用最新日期作为截止日期运行过滤脚本（只保留该日期**之后**的数据）：

```bash
python3 "/Users/Zhuanz/Documents/lexar进销存/process_weekly.py" filter_sales "YYYY/M/D"
```

将 `YYYY/M/D` 替换为步骤 3a 中获取的实际日期。

如果过滤后记录数为 0，跳过销售上传，直接进入步骤 4。

**3c. 上传销售数据**

1. 点击**"导入总代数据"**按钮
2. 弹出"导入销售明细模板"对话框后，找到文件上传 input 元素
3. 使用 `file_upload` 工具上传 `/Users/Zhuanz/Documents/lexar进销存/weekly_upload/sales_upload_filtered.xlsx`
4. 点击**"下一步"**按钮
5. 截图确认上传成功

> 销售导入是**追加**模式，不会清空现有数据。

### 步骤 4：通知完成

通过飞书发送完成通知：

```bash
lark-cli im +messages-send --user-id "ou_70cee713b6dbf203fb713f88c8a5d13a" --text "✅ 本周 Lexar 进销存数据已全部上传完成" --as bot
```

最后简要汇报全部结果：处理了多少 SKU、上传了多少条销售记录、是否全部成功。

## 关键信息

| 项目 | 值 |
|---|---|
| 飞书数据源 | `https://xxx0an5xw1s.feishu.cn/sheets/IjPGsnJ1ohjMzWtSaITcf3ssnQf` |
| 库存 sheet | `STOCK-MMDD`（每周变化） |
| 销售 sheet | `sheet_id=ULyVmO`（固定） |
| 网站 | `https://bedrock.pexar.us/warroom/dashboard/customer` |
| 处理脚本 | `/Users/Zhuanz/Documents/lexar进销存/process_weekly.py` |
| 输出目录 | `/Users/Zhuanz/Documents/lexar进销存/weekly_upload/` |
| 飞书通知用户 | `ou_70cee713b6dbf203fb713f88c8a5d13a` |

## 库存汇总规则

| 仓库名匹配 | 归入列 |
|---|---|
| 包含 `AMAZON` | lexar online库存 |
| `7117.荷兰EI完税仓` | lexar NL库存 |
| `7436.中山保税HKYS成品仓` 或 `7437.中山保税GPSR成品仓` | lexar HK库存 |
| 其余（佶速为JSW、RMA、DCL 等） | 排除 |
