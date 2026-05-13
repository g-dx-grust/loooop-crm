# Looopでんき 催事販売CRM ─ ドキュメント

指示書（[../指示書.md](../指示書.md)）を起点に、AI実装で各フェーズを並列に進めるためのドキュメント群。

## 読む順番
1. [00_overview.md](./00_overview.md) ─ 全体像・技術スタック
2. [IMPLEMENTATION_ORDER.md](./IMPLEMENTATION_ORDER.md) ─ **直列／並列マップ（最重要）**
3. [01_tech_stack_setup.md](./01_tech_stack_setup.md) ─ 環境構築
4. [02_database_schema.md](./02_database_schema.md) ─ DBスキーマ
5. [03_auth_rbac.md](./03_auth_rbac.md) ─ 認証・権限

以降は実装Track別。Phase 1 は 04〜09 を**並列**に、最後に 10 を**直列**で締める：

- [04_customer_form.md](./04_customer_form.md)
- [05_address_googlemaps.md](./05_address_googlemaps.md)
- [06_customer_list_detail.md](./06_customer_list_detail.md)
- [07_looop_application.md](./07_looop_application.md)
- [08_cross_sell.md](./08_cross_sell.md)
- [09_consent_management.md](./09_consent_management.md)
- [10_solar_handoff_csv.md](./10_solar_handoff_csv.md) ← Phase 1 の締め
- [11_audit_logs.md](./11_audit_logs.md)
- [12_kpi_dashboard.md](./12_kpi_dashboard.md) ← Phase 2
- [13_security_ops.md](./13_security_ops.md)
