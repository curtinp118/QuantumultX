/*

dreamface 3.0.0

[rewrite_local]
https://www.dreamfaceapp.com/df-server/user/save_user_login url script-response-body https://raw.githubusercontent.com/Curtinp/QuantumultX/main/Rewrite/dreamface.js

[mitm]
hostname = www.dreamfaceapp.com

*/
var objc = JSON.parse($response.body);

    objc = {
  "data": {
    "rights": {
      "expires_date_format": "2099-09-09 19:27:05.000",
      "vip_type": "TRY_YEAR_PACKAGE",
      "have_trial": false,
      "vip_remainder_day": 9999,
      "vip_label": true,
      "expires_date": 4092595200000
    },
    "device_name": "iPhone13,3",
    "system_version": "17.1.1",
    "app_version": "3.0.0",
    "app_package_name": "DreamFace",
    //"user_id": "08A900C5-E40E-43D9-B3F1-D5118195DFA6",
    "device_system": "iOS",
    "country_code": "cn"
  },
  "status_code": "THS12140000000",
  "extend": {
  },
  "status_msg": "Success"
}

$done({body : JSON.stringify(objc)});
