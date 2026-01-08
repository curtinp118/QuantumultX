/******************************
脚本功能：彩云天气-登陆后解锁会员
更新时间：2024-06-10
*******************************
[rewrite_local]
^https:\/\/biz\.cyapi\.cn\/ url script-response-body https://raw.githubusercontent.com/Curtinp/QuantumultX/main/Rewrite/cytq.js
[mitm] 
hostname = biz.cyapi.cn
*******************************/

var aFengYe = $response.body;
var obj =  JSON.parse(aFengYe);

if($request.url.indexOf("/v2/user") != -1) {
  obj.result.is_vip = true;
  obj.result.vip_type = "s";
  obj.result.svip_expired_at = 4070951226;
}

aFengYe = JSON.stringify(obj);
$done(aFengYe);
