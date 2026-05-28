/******************************
脚本功能：Nicegram 1.4.7-解锁会员
更新时间：2024-06-08
作者：Curtinp118
*******************************
[rewrite_local]
https://nicegram.cloud/api/v6/user/info url script-response-body https://raw.githubusercontent.com/curtinp118/QuantumultX/refs/heads/main/scripts/nicegram.js

[mitm]
hostname = nicegram.cloud
*******************************/

const body = JSON.parse($response.body);
body.data.user.lifetime_subscription = true;
body.data.user.store_subscription = true;
body.data.user.subscription = true;
$done({ body: JSON.stringify(body) });
