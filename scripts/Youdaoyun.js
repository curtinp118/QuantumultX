/******************************
脚本功能：有道云笔记-VIP功能
更新时间：2024-06-08
*******************************
[mitm] 
hostname: note.youdao.com
*******************************/

const path1 = "/api/self";
const path2 = "/mapi/payment";

let obj = JSON.parse($response.body);

if ($request.url.indexOf(path1) != -1){
obj.vip = true,
obj.properties.FEED_BACK_ID = 1,
obj.properties.isvip = true
}
if ($request.url.indexOf(path2) != -1){
obj.service = 1,
obj.payYear = true,
obj.end = 1867248816000
}
$done({body: JSON.stringify(obj)});
