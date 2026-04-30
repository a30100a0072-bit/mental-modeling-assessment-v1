-- [認知幾何 V1 - 移除舊版自家會員系統殘骸]
-- 認證已全面遷移至 chiyigo.com SSO，本地 users / security_logs 表已無人寫入
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS security_logs;
