---
name: pexar-purchase-plan
description: 生成 Pexar 月度备货计划（PSI 月会用）。当用户提供库存截图和 forecast 截图，要求生成备货计划、计算采购缺口、建议投单量时使用。触发场景包括：PSI 月会、备货计划、采购计划、投单建议、库存缺口分析，或每月第一个周二前的例行备货决策。即使用户只说"帮我做下这个月的备货计划"并附带截图，也应触发此 skill。
---

# Pexar Purchase Plan（月度备货计划）

每月第一个周二 PSI 月会前，基于上月末库存数据和未来 forecast 生成备货计划表，计算库存缺口并建议采购投单量。

## 输入数据

用户提供两组截图：

### 1. 库存数据（来源：bedrock.pexar.us/warroom/dashboard/inventory）

从截图中提取每个 SKU 的：
- **总库存**（即时库存 + 调拨调整后的总量）
- **采购在途**

库存截图中 `-` 表示 0。

### 2. Forecast 数据

从截图中提取每个 SKU 未来各月的需求预测。注意 forecast 表中的产品名是中文简称，需映射到 SKU 编号。

## SKU 名称映射

| Forecast 中文名 | SKU 编号 |
|---|---|
| 15寸GL | PX-156SSLGL |
| 12.7寸GL | （无对应库存 SKU，仅记录） |
| 10寸黑色Terra GL | PX-101TGRYGL |
| 11寸沙色GLR | PX-110SDGLR |
| 11寸黑色GLR | PX-110BLKGLR |
| 11寸黑色/沙色KR | PX-110SDKR |
| 11寸沙色GL | PX-110SDGL |
| 11寸NA（无颜色前缀=沙色） | PX-110SDNA |
| 11寸 Pexar 黑GL | PX-110KBLKGLP |
| 11寸黑色GL | PX-110BLKGL |
| 11寸黑色NA | PX-110BLKNA |
| 11寸 Pexar 黑NA | PX-110KBLKNAP |

如果出现新的 SKU 未在此表中，根据命名规律推断映射，并在输出中标注需确认。

## 栈板量（Pallet Quantity）

从飞书表格自动读取：
- **表格 URL**: `https://rcn8o1s8sbx4.feishu.cn/sheets/FlSssSS8qhB8A4tW0ppcUuclnBg`
- **Sheet**: `产品list`（sheet_id: `YZKfpk`）
- **列**: A 列 = SKU 名称，F 列 = 整栈数（栈板量）

```bash
set +H && lark-cli sheets +csv-get \
  --url "https://rcn8o1s8sbx4.feishu.cn/sheets/FlSssSS8qhB8A4tW0ppcUuclnBg" \
  --sheet-id "YZKfpk" --range "A2:F15" --as user
```

当前已知栈板量（如飞书数据不可用时的 fallback）：

| SKU | 栈板量 |
|---|---|
| PX-156SSLGL | 48 |
| 其余所有 11 寸 / 10 寸产品 | 180 |

## 计算逻辑

### GAP 计算（两个维度）

当前月份为 N 月：
- **未来 3 个月预测** = N月 + (N+1)月 + (N+2)月 的 forecast 之和
- **未来 6 个月预测** = N月 到 (N+5)月 的 forecast 之和
- **GAP(3M)** = 总库存 + 采购在途 − 未来 3 个月预测
- **GAP(6M)** = 总库存 + 采购在途 − 未来 6 个月预测

### 建议投单量

仅当 **GAP(3M) < 0** 时建议投单：
- **TT建议投单量** = `CEILING(ABS(GAP_3M) / 栈板量, 1) × 栈板量`
- 取整规则：向上取到栈板量的整数倍

### 需求时间

根据 forecast 逐月累算，找到库存首次跌破 0 的月份。

### 投单工厂分配

- **HK建议投单量** + **SZ建议投单量** = TT建议投单量
- 默认全部填入 **SZ建议投单量**，HK 留空由会议决策

## 输出

### 输出位置

写入飞书 wiki 文档：`https://rcn8o1s8sbx4.feishu.cn/wiki/WZ0EwTOo5izvAkkzXXIcX0TQnmg`

在当月 PSI 月会标题下插入嵌入式电子表格（`<sheet type="blank"></sheet>`），不要用静态 doc 表格。

### 表格列结构

| 列 | 内容 | 类型 |
|---|---|---|
| A | 规格型号 | 值 |
| B | 总库存 | 值 |
| C | 采购在途 | 值 |
| D | 未来3个月预测 | 值 |
| E | 未来6个月预测 | 值 |
| F | GAP(3M) | 公式: `=B+C-D` |
| G | GAP(6M) | 公式: `=B+C-E` |
| H | 栈板量 | 值（从飞书读取） |
| I | HK建议投单量 | 手动填写（默认空） |
| J | SZ建议投单量 | 手动填写（默认填入建议值） |
| K | TT建议投单量 | 公式: `=IF(F<0,CEILING(ABS(F)/H,1)*H,0)` |
| L | 需求时间 | 值 |

### 表头样式

- A-H 列表头：黄色背景 `#FFF67A`，加粗，居中
- I-L 列表头：蓝色背景 `#D6EAFF`，加粗，居中

### Callout 说明

在表格后插入一个 `<callout>` 标注需关注的 SKU：
- GAP(3M) 为负的 SKU（需要投单）
- GAP(3M) 正但 GAP(6M) 为负的 SKU（提前关注）
- 有采购在途但无 forecast 的 SKU（需确认需求计划）

## 执行步骤

1. **读取栈板量**：从飞书表格 `产品list` 读取各 SKU 栈板量
2. **解析截图**：从用户提供的库存和 forecast 截图中提取数据
3. **映射 SKU**：将 forecast 中文名映射到 SKU 编号
4. **计算**：GAP、建议投单量、需求时间
5. **定位文档**：fetch wiki 文档 outline，找到当月 PSI 月会的 h1 标题 block ID
6. **插入 sheet**：在标题后 `block_insert_after` 插入 `<sheet type="blank"></sheet>`
7. **填充数据**：用 `lark-cli sheets` 写入数据、公式、样式
8. **插入 callout**：在 sheet 后插入关注事项说明
9. **验证**：`csv-get` 回读确认公式计算正确

## 注意事项

- 写公式和写数据的顺序：先 csv-put 写值 → 再 cells-set 写公式，不要让 csv-put 覆盖已有公式
- copy-to-range 会覆盖目标区域的值，写完公式后不要再对同区域执行 csv-put
- 嵌入 sheet 的 token 格式：从 doc fetch 的 `<sheet token="..." sheet-id="...">` 中取 token 和 sheet-id
- 使用 `--as user` 身份操作飞书
