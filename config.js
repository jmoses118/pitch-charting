// Public client config. The publishable key is public by design; data access is enforced by RLS + team code.
// chartColumn stays unset until supabase/migrations/20261014180000_scoring_chart.sql is applied.
// Do not set it here: the live project does not have those columns yet.
window.PC_CONFIG={url:'https://qeqijbrokrkzpcacpjyw.supabase.co',key:'sb_publishable_vwT3XEfeel6WAzDgtI4zRQ_5Zh-VhXy',scorerColumn:true};
