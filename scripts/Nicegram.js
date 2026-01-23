/******************************
脚本功能：Nicegram 1.4.7-解锁会员
更新时间：2024-06-08
*******************************
[rewrite_local]
https://nicegram.cloud/api/v6/user/info url script-response-body https://raw.githubusercontent.com/curtinp118/QuantumultX/refs/heads/main/scripts/Nicegram.js

[mitm] 
hostname = nicegram.cloud
*******************************/

var Q = JSON.parse($response.body);
Q.data.user.lifetime_subscription = true;
Q.data.user.store_subscription = true;
Q.data.user.subscription = true;
$done({body : JSON.stringify(Q)});
