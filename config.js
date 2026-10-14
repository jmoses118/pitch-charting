// Public client config. The publishable key is public by design; data access is enforced by RLS + team code.
// shakeColumn and chartColumn are on. Apply these before merge, in order:
//   supabase/migrations/20261014140000_shake_off.sql
//   supabase/migrations/20261014180000_scoring_chart.sql
window.PC_CONFIG={url:'https://qeqijbrokrkzpcacpjyw.supabase.co',key:'sb_publishable_vwT3XEfeel6WAzDgtI4zRQ_5Zh-VhXy',scorerColumn:true,shakeColumn:true,chartColumn:true};
