-- 주간 리포트를 기본으로 켠다.
-- 정기 발송은 설정 행이 없는 사용자도 켜짐으로 보고 로그인 이메일로 보낸다(weekly-memo-report).
-- 기존 행은 기능을 연 직후라 직접 끈 사람이 없으므로 모두 켠다.
alter table memo.setting alter column weekly_report_enabled set default true;

update memo.setting set weekly_report_enabled = true where weekly_report_enabled = false;
