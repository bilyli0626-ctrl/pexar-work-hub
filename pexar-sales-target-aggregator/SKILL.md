---
name: pexar-sales-target-aggregator
description: Aggregate Pexar sales target data from screenshots/images into a standardized CSV for import. Use this skill whenever the user sends a screenshot or image containing Pexar sales target data (columns typically include customer, SKU/material model like PX-XXX, QTY, Sell-in price, Total Amount) and asks to consolidate, summarize, merge, or import the data into a CSV template. Trigger on phrases like "把这张图的数据汇总", "合并同类项", "sales target", "销售目标", "填入模板", "按客户+型号合并", or when the user provides a sales_target_template CSV alongside a sales data screenshot.
---

# Pexar Sales Target Aggregator

This skill consolidates Pexar sales target data from screenshots/images into a standardized CSV format ready for system import.

## Purpose & Context

The user (Pexar marketing/operations team) regularly receives sales target tables as screenshots. These tables contain multiple line items per customer/SKU combination that need to be:
1. Merged by customer + material model (SKU)
2. Normalized with full legal customer names
3. Tagged with the correct year and quarter
4. Output as a CSV matching the import template

## Output Format

The target CSV always has exactly these 5 columns:

```
year,quarter,customerName,materialModel,targetAmount
```

- **year**: The current calendar year (e.g., 2026)
- **quarter**: Derived from the **current month when the user sends the request**, following standard calendar quarters:
  - Jan–Mar → `1`
  - **Apr–Jun → `2`**
  - Jul–Sep → `3`
  - Oct–Dec → `4`
  
  The user has explicitly confirmed this rule: "如果我是4月发你的，则表里的季度列填2"
- **customerName**: Full legal name (see mapping below). Wrap in double quotes if it contains a comma.
- **materialModel**: SKU code exactly as shown in the image (e.g., `PX-110BLKGLR`). Preserve case and all characters — do not "correct" apparent typos.
- **targetAmount**: Integer sum of the Total Amount column for that customer+SKU group.

## Customer Name Mapping

Apply this mapping strictly. Only rename the short names; leave already-full names as-is.

| Short name in screenshot | Full name to use in CSV |
|---|---|
| `Lexar` | `Lexar Co., Limited` |
| `Etailflow` | `Etailflow LLC` |
| `DTC` | `DTC` *(keep as-is — DTC is a distinct customer, not an abbreviation to expand)* |
| `Pexar Direct` | `Pexar Direct` *(keep as-is)* |

**Important**: Do not merge `DTC` and `Pexar Direct` — they are separate customers even though both are direct channels. Do not map either to `VAVARIVA INTERNATIONAL TECHNOLOGY LIMITED` unless the user explicitly says so for a new dataset.

If the screenshot contains a customer short name not in this table, ask the user what the full legal name should be before proceeding.

## Processing Steps

### 1. Extract rows from the image
Read every data row from the screenshot. Each row typically has: customer, material model/SKU, QTY, Sell-in price, Total Amount. Only the customer, SKU, and **Total Amount** matter for the output — QTY and Sell-in are just context.

### 2. Skip invalid rows
- Rows with no SKU (empty material model cell) — skip entirely even if they have a customer name.
- Rows with Total Amount = 0 can be included or skipped; prefer **including** them only if they're the only row for that customer+SKU combo (so the combo still appears). If another non-zero row exists for the same combo, the zero simply adds nothing.
- Ignore the footer "Total" / "Q1 Total" row — it's a sum, not a data row.

### 3. Aggregate by customer + material model
Group rows by the tuple `(customer, SKU)` and sum the `Total Amount` values. Treat similar-looking SKUs as **distinct** unless the user says otherwise:
- `PX-110SDGL` ≠ `PX-110SDGLR` (different SKUs)
- `PX-110BLKGLR` ≠ `PX-110BLKKR` (different SKUs)

Never "auto-correct" a SKU. If you suspect a typo, note it to the user but keep the original.

### 4. Apply customer name mapping
Replace short names with full legal names per the mapping table above.

### 5. Write the CSV
Overwrite the template file (or create a new file if no template is provided). Use this exact format:

```csv
year,quarter,customerName,materialModel,targetAmount
2026,2,"Lexar Co., Limited",PX-110BLKGLR,404352
2026,2,"Etailflow LLC",PX-156SSLGL,24360
2026,2,DTC,PX-156SSLGL,71461
2026,2,Pexar Direct,PX-101TGRYGL,19754
```

Rules:
- Wrap `customerName` in double quotes **only if** it contains a comma (e.g., `"Lexar Co., Limited"`). Names without commas (`DTC`, `Pexar Direct`, `Etailflow LLC`) don't need quotes.
- `targetAmount` is an integer, no decimals, no thousand separators.
- No trailing spaces, UTF-8, Unix line endings.

### 6. Verify totals and report
After writing the file, compute the sum of all `targetAmount` values and compare against the image's grand total (usually labeled "Q1 Total" or similar at the bottom). Small rounding differences (a few dollars) are expected because the image's per-row totals are themselves rounded. Report the computed total, the image total, and any difference.

## Response Format

After processing, present the user with a concise summary:

1. **Per-customer breakdown** — a small table showing each customer, number of SKUs, and subtotal.
2. **Per-row detail** — the SKU and amount for each customer (so the user can spot-check).
3. **Grand total verification** — computed vs. image, plus any discrepancy.
4. **File location** — the full path where the CSV was saved.
5. **Flags & assumptions** — call out anything non-obvious:
   - SKUs you kept as-is that looked like possible typos
   - Zero-amount rows
   - Any unknown customer short names you had to ask about

## Example

**User input**: A screenshot showing sales data + the instruction "把这张图的信息数据汇总进表格" sent in April 2026, with template file `sales_target_template_2026Q2.csv`.

**Processing**:
- Current month = April → quarter = 2
- Year = 2026
- Merge 34 rows down to ~13 unique customer+SKU combinations
- Apply customer name mapping

**Output CSV first lines**:
```csv
year,quarter,customerName,materialModel,targetAmount
2026,2,"Lexar Co., Limited",PX-110BLKGLR,404352
2026,2,"Lexar Co., Limited",PX-156SSLGL,148800
...
```

**Summary** reported to user includes per-customer totals, grand total check (e.g., "computed $996,564 vs. image $996,562 — $2 rounding difference"), and the file path.
