---
name: lexar-inventory
description: "Lexar 客户进销存周报数据处理与上传。当用户提到更新进销存、上传库存、上传销售数据、处理 Lexar 数据、进销存周报、刷新库存、导入库存、导入销售、bedrock 上传等意图时触发。即使用户只是简单说'更新一下数据'或'帮我上传'，只要上下文涉及 Lexar/客户进销存/bedrock，也应触发此 skill。"
---

# Lexar 客户进销存周报处理与上传

处理飞书数据源中的库存和销售数据，生成符合 bedrock 网站要求的 Excel 文件，并通过浏览器上传。

## 工作流程

按顺序执行以下四个步骤。数据处理、页面导航、数据核对、飞书通知都由你自动完成，**唯一需要用户帮忙的是「选择文件」那一下**——原因见下方「⚠️ 文件上传限制」。除此之外不要无谓地停下来等确认。

> ### ⚠️ 文件上传限制（每次上传前必读）
> 浏览器的 `file_upload` 工具有安全白名单，**只接受真正作为聊天附件上传的文件，不接受任何本地磁盘路径**。已验证以下路径全部会被拒：`weekly_upload` 原目录、会话 scratchpad、项目工作目录、`request_directory` 授权过的目录、用户用 `@` 引用的路径。所以你**没法自己把本地 Excel 塞进网页上传控件**。
>
> 正确做法：弹出上传对话框后，请用户点对话框里的「选择文件」按钮，在系统文件选择器里选中目标文件（把完整路径念给用户）。用户选好后，**其余按钮（确认导入 / 下一步）、截图核对、切 tab、发通知全部由你来点**。用户在整个流程里只需在「选文件」这一步各点一次（库存一次、销售一次）。

### 步骤 1：数据处理

运行处理脚本，从飞书读取数据并生成上传文件：

```bash
python3 "/Users/Zhuanz/Documents/lexar进销存/process_weekly.py" process
```

脚本做了什么：
- 从飞书电子表格读取当周 STOCK sheet（命名格式 `STOCK-MMDD`），按仓库规则汇总库存
- 读取 sale sheet（sheet_id=ULyVmO），**动态获取该 sheet 的实际行数再读取，绝不会截断**（历史上曾硬编码 `A1:O500`，导致 500 行以后的最新发货记录被整段丢掉——已修复）
- 剔除 Customer 含 Amazon 的记录和 QTY ≤ 0 的记录（退货/负数量按设计排除），保留源数据所有列
- 输出两个文件到 `/Users/Zhuanz/Documents/lexar进销存/weekly_upload/`：
  - `customer_inventory_upload.xlsx` — 库存上传文件
  - `sales_upload_full.xlsx` — 全量非亚马逊、QTY>0 的销售数据（所有列）

解析返回的 JSON，记录 SKU 数量、销售记录数、日期范围。**核对一下 `date_range` 的最大日期是否覆盖到最近几天**——如果最新日期明显偏旧（比如今天已是 7 月却只到 6 月中），说明数据源或读取有问题，先排查再继续。确认无误后继续下一步。

如果脚本报错（找不到 STOCK sheet 等），告知用户并终止流程。

### 步骤 2：上传库存数据

需要浏览器操作。用户调用此 skill 时默认已登录网站。

上传流程：
1. 加载 Chrome MCP 工具（`mcp__claude-in-chrome__*`，通过 ToolSearch 批量加载 `tabs_context_mcp,navigate,computer,read_page,find,file_upload`），先 `tabs_context_mcp{createIfEmpty:true}` 拿到 tab，然后 `navigate` 到 `https://bedrock.pexar.us/warroom/dashboard/customer`，截图确认已登录
2. 在客户进销存看板页面，点击右上角**"导入库存"**按钮
3. 弹出"导入SKU库存"对话框
4. **请用户帮忙选文件**：告诉用户「点弹窗里的『选择文件』，选中 `/Users/Zhuanz/Documents/lexar进销存/weekly_upload/customer_inventory_upload.xlsx`，选好跟我说一声」。（不要自己调 `file_upload` 传本地路径——会被安全策略拒，见上方限制说明。）
5. 用户确认选好后，截图确认文件名已显示在对话框里，再点**"确认导入"**按钮
6. 截图确认上传成功

> 库存导入会**替换**现有库存快照，这是预期行为。

### 步骤 3：上传销售数据

分两步：先确定截止日期，再上传过滤后的数据。

**3a. 查看网站最新发货日期（截止日期的唯一权威来源）**

1. 在网站上点击**"销售订单明细"** tab
2. 截图查看第一行数据的发货日期（页面默认按日期降序排列，第一行即为最新日期）
3. 记录最新日期，格式如 `2026/5/28`

> 这一步就是「bedrock 已有哪些记录」的答案，**必须以网站实际显示为准**，不要凭记忆或用户口头日期拍脑袋。用户即使给了截止日期，也要在网站上核对一遍再用。过滤用的是严格「晚于」该日期（`>`），即当天及更早的记录视为已上传、不再重复导出。

**3b. 过滤并生成上传文件**

用最新日期作为截止日期运行过滤脚本（只保留该日期**之后**的数据）：

```bash
python3 "/Users/Zhuanz/Documents/lexar进销存/process_weekly.py" filter_sales "YYYY/M/D"
```

将 `YYYY/M/D` 替换为步骤 3a 中获取的实际日期。

如果过滤后记录数为 0，跳过销售上传，直接进入步骤 4。

**3c. 上传销售数据**

1. 点击右上角**"导入总代数据"**按钮
2. 弹出"导入销售明细模板"对话框
3. **请用户帮忙选文件**：告诉用户「点『选择文件』，选中 `/Users/Zhuanz/Documents/lexar进销存/weekly_upload/sales_upload_filtered.xlsx`，选好跟我说一声」。（同样不要自己调 `file_upload` 传本地路径。）
4. 用户确认选好后，截图确认文件名已显示，再点**"下一步"**按钮
5. 截图确认上传成功

> 销售导入是**追加**模式，不会清空现有数据。所以截止日期一旦弄错会造成重复记录——这也是 3a 必须以网站实际最新日期为准的原因。

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
