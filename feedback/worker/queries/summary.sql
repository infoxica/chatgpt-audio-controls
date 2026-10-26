SELECT source, reason, count(*) AS responses FROM feedback GROUP BY source, reason ORDER BY responses DESC;
SELECT extension_version, count(*) AS responses FROM feedback GROUP BY extension_version;
SELECT substr(received_at, 1, 10) AS day, count(*) AS responses FROM feedback GROUP BY day ORDER BY day DESC;
SELECT locale, count(*) AS responses FROM feedback GROUP BY locale ORDER BY responses DESC;
