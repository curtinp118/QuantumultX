/******************************
脚本功能：NS论坛签到
更新时间：2026-01-17
*******************************
[rewrite_local]
^https:\/\/www\.nodeseek\.com\/api\/account\/getInfo\/\d+\?readme=1$ url script-request-header https://raw.githubusercontent.com/curtinp118/QuantumultX/refs/heads/main/scripts/NSCheckin.js

[task_local]
10 8 * * * https://raw.githubusercontent.com/curtinp118/QuantumultX/refs/heads/main/scripts/NSCheckin.js, tag=NS🍗签到, img-url=https://raw.githubusercontent.com/fmz200/wool_scripts/main/icons/apps/shutiao.png, enabled=true

[MITM]
hostname = www.nodeseek.com
*******************************/

const NS_HEADER_KEY = "NS_NodeseekHeaders";
const isGetHeader = typeof $request !== "undefined";

const NEED_KEYS = [
  "Connection",
  "Accept-Encoding",
  "Priority",
  "Content-Type",
  "Origin",
  "refract-sign",
  "User-Agent",
  "refract-key",
  "Sec-Fetch-Mode",
  "Cookie",
  "Host",
  "Referer",
  "Accept-Language",
  "Accept",
];

function pickNeedHeaders(src = {}) {
  const dst = {};
  const get = (name) =>
    src[name] ??
    src[name.toLowerCase()] ??
    src[name.toUpperCase()];
  for (const k of NEED_KEYS) {
    const v = get(k);
    if (v !== undefined) dst[k] = v;
  }
  return dst;
}

if (isGetHeader) {
  const allHeaders = $request.headers || {};
  const picked = pickNeedHeaders(allHeaders);

  if (!picked || Object.keys(picked).length === 0) {
    console.log("[NS] picked headers empty:", JSON.stringify(allHeaders));
    $notify("NS Headers 获取失败", "", "未获取到指定请求头，请重新再试一次。");
    $done({});
  } else {
    const ok = $prefs.setValueForKey(JSON.stringify(picked), NS_HEADER_KEY);
    console.log("[NS] saved picked headers:", JSON.stringify(picked));
    if (ok) {
      $notify("NS Headers 获取成功", "", "指定请求头已持久化保存。");
    } else {
      $notify("NS Headers 保存失败", "", "写入持久化存储失败，请检查配置。");
    }
    $done({});
  }
} else {
  // 🔹 读取已保存指定 headers，重放签到请求：https://www.nodeseek.com/api/attendance?random=true
  const raw = $prefs.valueForKey(NS_HEADER_KEY);
  if (!raw) {
    $notify("NS签到结果", "无法签到", "本地没有已保存的请求头，请先抓包访问一次 个人页面。");
    return $done();
  }

  let savedHeaders = {};
  try {
    savedHeaders = JSON.parse(raw) || {};
  } catch (e) {
    console.log("[NS] parse saved headers failed:", e);
    $notify("NS签到结果", "无法签到", "本地保存的请求头数据损坏，请重新访问一次个人页面。");
    return $done();
  }

  const url = `https://www.nodeseek.com/api/attendance?random=true`;
  const method = `POST`;

  const headers = {
    Connection: savedHeaders["Connection"] || `keep-alive`,
    "Accept-Encoding":
      savedHeaders["Accept-Encoding"] || `gzip, deflate, br`,
    Priority: savedHeaders["Priority"] || `u=3, i`,
    "Content-Type":
      savedHeaders["Content-Type"] || `text/plain;charset=UTF-8`,
    Origin: savedHeaders["Origin"] || `https://www.nodeseek.com`,
    "refract-sign": savedHeaders["refract-sign"] || ``,
    "User-Agent":
      savedHeaders["User-Agent"] ||
      `Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7.2 Mobile/15E148 Safari/604.1`,
    "refract-key": savedHeaders["refract-key"] || ``,
    "Sec-Fetch-Mode": savedHeaders["Sec-Fetch-Mode"] || `cors`,
    Cookie: savedHeaders["Cookie"] || ``,
    Host: savedHeaders["Host"] || `www.nodeseek.com`,
    Referer:
      savedHeaders["Referer"] ||
      `https://www.nodeseek.com/sw.js?v=0.3.33`,
    "Accept-Language":
      savedHeaders["Accept-Language"] || `zh-CN,zh-Hans;q=0.9`,
    Accept: savedHeaders["Accept"] || `*/*`,
  };

  const body = ``;

  const myRequest = {
    url: url,
    method: method,
    headers: headers,
    body: body,
  };

  $task.fetch(myRequest).then(
    (resp) => {
      const status = resp.statusCode;
      const body = resp.body || "";

      let msg = "";
      try {
        const obj = JSON.parse(body);
        msg = obj?.message ? String(obj.message) : "";
        console.log(`[NS签到] parsed message: ${msg || "(empty)"}`);
      } catch (e) {
        console.log(`[NS签到] JSON parse failed: ${e}`);
      }

      if (status === 403) {
        const content = `暂时被风控，稍后再试\n${
          msg ? `内容：${msg}` : `响应体：${body}`
        }`;
        console.log(`[NS签到] notify(403): ${content}`);
        $notify("NS签到结果", "403 风控", content);
      } else if (status === 500) {
        const content = msg || body || "服务器错误(500)，无返回内容";
        console.log(`[NS签到] notify(500): ${content}`);
        $notify("NS签到结果", "500 服务器错误", content);
      } else if (status >= 200 && status < 300) {
        const content = msg || "NS签到成功，但未返回 message";
        console.log(`[NS签到] notify(success): ${content}`);
        $notify("NS签到结果", "签到成功", content);
      } else {
        const content = msg || body || `请求失败，status=${status}`;
        console.log(`[NS签到] notify(other): ${content}`);
        $notify("NS签到结果", `请求异常 ${status}`, content);
      }

      $done();
    },
    (reason) => {
      const err = reason?.error ? String(reason.error) : String(reason || "");
      console.log(`[NS签到] request error: ${err}`);
      $notify("NS签到结果", "请求错误", err);
      $done();
    }
  );
}