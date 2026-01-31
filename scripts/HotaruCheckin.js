/******************************
脚本功能：HotaruAPI 签到
更新时间：2026-01-31
使用说明：先抓包一次保存 Cookie，再由定时任务自动签到。

[rewrite_local]
^https:\/\/api\.hotaruapi\.top\/api\/user\/checkin$ url script-request-header https://raw.githubusercontent.com/curtinp118/QuantumultX/refs/heads/main/scripts/HotaruCheckin.js

[task_local]
10 9 * * * https://raw.githubusercontent.com/curtinp118/QuantumultX/refs/heads/main/scripts/HotaruCheckin.js, tag=HotaruAPI签到, enabled=true

[MITM]
hostname = api.hotaruapi.top
*******************************/

const HOTARU_HEADER_KEY = "HOTARU_Checkin_Headers";
const isGetHeader = typeof $request !== "undefined";

const NEED_KEYS = [
  "Host",
  "User-Agent",
  "Accept",
  "Accept-Language",
  "Accept-Encoding",
  "Origin",
  "Referer",
  "Cookie",
  "new-api-user",
];

function pickNeedHeaders(src = {}) {
  const dst = {};
  const lowerMap = {};
  for (const k of Object.keys(src || {})) lowerMap[String(k).toLowerCase()] = src[k];
  const get = (name) => src[name] ?? lowerMap[String(name).toLowerCase()];
  for (const k of NEED_KEYS) {
    const v = get(k);
    if (v !== undefined) dst[k] = v;
  }
  return dst;
}

function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch (_) {
    return null;
  }
}

if (isGetHeader) {
  const allHeaders = $request.headers || {};
  const picked = pickNeedHeaders(allHeaders);

  if (!picked || !picked.Cookie || !picked["new-api-user"]) {
    console.log("[HotaruCheckin] header capture failed:", JSON.stringify(allHeaders));
    $notify(
      "HotaruAPI",
      "未抓到关键信息",
      "请在触发 /api/user/checkin 请求时抓包（需要包含 Cookie 和 new-api-user）。"
    );
    $done({});
  }

  const ok = $prefs.setValueForKey(JSON.stringify(picked), HOTARU_HEADER_KEY);
  console.log(
    `[HotaruCheckin] saved headers (${Object.keys(picked).length}) to $prefs key=${HOTARU_HEADER_KEY}:`,
    JSON.stringify(picked)
  );
  $notify(ok ? "HotaruAPI 参数获取成功" : "HotaruAPI 参数保存失败", "", ok ? "后续将用于自动签到。" : "写入本地存储失败，请检查 Quantumult X 配置。");
  $done({});
} else {
  const raw = $prefs.valueForKey(HOTARU_HEADER_KEY);
  if (!raw) {
    $notify("HotaruAPI", "缺少参数", "请先抓包保存一次 /api/user/checkin 的请求头。");
    return $done();
  }

  const savedHeaders = safeJsonParse(raw);
  if (!savedHeaders) {
    $notify("HotaruAPI", "参数异常", "已保存的请求头解析失败，请重新抓包保存。");
    return $done();
  }

  const url = "https://api.hotaruapi.top/api/user/checkin";
  const method = "POST";

  const headers = {
    Host: savedHeaders.Host || "api.hotaruapi.top",
    Accept: savedHeaders.Accept || "application/json, text/plain, */*",
    "Accept-Language": savedHeaders["Accept-Language"] || "zh-CN,zh-Hans;q=0.9",
    "Accept-Encoding": savedHeaders["Accept-Encoding"] || "gzip, deflate, br",
    Origin: savedHeaders.Origin || "https://api.hotaruapi.top",
    Referer: savedHeaders.Referer || "https://api.hotaruapi.top/console/personal",
    "User-Agent": savedHeaders["User-Agent"] || "QuantumultX",
    Cookie: savedHeaders.Cookie || "",
    "new-api-user": savedHeaders["new-api-user"] || "",
  };

  const myRequest = { url, method, headers, body: "" };

  $task.fetch(myRequest).then(
    (resp) => {
      const status = resp.statusCode;
      const body = resp.body || "";

      const obj = safeJsonParse(body) || {};
      const success = Boolean(obj.success);
      const message = obj.message ? String(obj.message) : "";
      const checkinDate = obj?.data?.checkin_date ? String(obj.data.checkin_date) : "";
      const quotaAwarded =
        obj?.data?.quota_awarded !== undefined ? String(obj.data.quota_awarded) : "";

      console.log(
        `[HotaruCheckin] status=${status} success=${String(success)} checkin_date=${checkinDate || "(empty)"} quota_awarded=${quotaAwarded || "(empty)"} message=${message || "(empty)"}`
      );

      if (status === 401 || status === 403) {
        $notify("HotaruAPI", "登录失效", `HTTP ${status}，请重新抓包保存 Cookie。\n${message || body}`);
      } else if (status >= 200 && status < 300) {
        if (success) {
          const content = `${checkinDate ? `日期：${checkinDate}\n` : ""}${quotaAwarded ? `获得：${quotaAwarded}` : "签到成功"}`;
          $notify("HotaruAPI", "签到成功", content);
        } else {
          $notify("HotaruAPI", "签到失败", message || body || `HTTP ${status}`);
        }
      } else {
        $notify("HotaruAPI", `接口异常 ${status}`, message || body);
      }

      $done();
    },
    (reason) => {
      const err = reason?.error ? String(reason.error) : String(reason || "");
      console.log(`[HotaruCheckin] request error: ${err}`);
      $notify("HotaruAPI", "网络错误", err);
      $done();
    }
  );
}
