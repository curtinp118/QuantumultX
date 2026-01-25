
/******************************
脚本功能：成都地铁签到(积分)
更新时间：2026-01-25
说明：先用 rewrite 抓取请求头(自动去敏)，再用 task 定时签到
*******************************
[rewrite_local]
^https:\/\/app\.cdmetro\.chengdurail\.cn\/platform\/users\/user\/sign-in-integral(-day)?(\\?.*)?$ url script-request-header https://raw.githubusercontent.com/curtinp118/QuantumultX/refs/heads/main/scripts/CDRail.js

[task_local]
10 9 * * * https://raw.githubusercontent.com/curtinp118/QuantumultX/refs/heads/main/scripts/CDRail.js, tag=成都地铁签到, img-url=https://raw.githubusercontent.com/fmz200/wool_scripts/main/icons/doraemon/Doraemon-1022.png, enabled=true

[MITM]
hostname = app.cdmetro.chengdurail.cn
*******************************/

const CD_HEADER_KEY = "CD_CDRailHeaders";
const isGetHeader = typeof $request !== "undefined";

const NEED_KEYS = [
  "Connection",
  "Accept-Encoding",
  "Accept",
  "Accept-Language",
  "Content-Type",
  "Host",
  "User-Agent",
  "system-version",
  "system",
  "app-version",
  "appVersion",
  "device-id",
  "deviceId",
  "source",
  "vendor",
  "language",
  "user",
  "token",
  "app-token",
  "Cookie",
];

function pickNeedHeaders(src = {}) {
  const dst = {};
  const get = (name) =>
    src[name] ?? src[name.toLowerCase()] ?? src[name.toUpperCase()];
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
    console.log("[CDRail] picked headers empty:", JSON.stringify(allHeaders));
    $notify(
      "成都地铁",
      "未抓到请求头",
      "请在 App 内打开签到页，触发一次 sign-in-integral(-day) 请求后再试。"
    );
    $done({});
  } else {
    const ok = $prefs.setValueForKey(JSON.stringify(picked), CD_HEADER_KEY);
    console.log(
      `[CDRail] saved picked headers (${Object.keys(picked).length}) to $prefs key=${CD_HEADER_KEY}:`,
      JSON.stringify(picked)
    );
    $notify(
      ok ? "成都地铁 Headers 获取成功" : "成都地铁 Headers 保存失败",
      "",
      ok ? "已保存请求头，后续将用于自动签到。" : "保存失败：写入本地存储失败，请检查 Quantumult X 配置。"
    );
    $done({});
  }
} else {
  const raw = $prefs.valueForKey(CD_HEADER_KEY);
  if (!raw) {
    $notify(
      "成都地铁",
      "缺少请求头",
      "请先抓包：在 App 内触发一次 sign-in-integral(-day) 请求，用于保存登录信息。"
    );
    return $done();
  }

  let savedHeaders = {};
  try {
    savedHeaders = JSON.parse(raw) || {};
  } catch (e) {
    console.log("[CDRail] parse saved headers failed:", e);
    $notify("成都地铁", "请求头异常", "已保存的请求头解析失败，请重新抓包保存。");
    return $done();
  }

  const url = `https://app.cdmetro.chengdurail.cn/platform/users/user/sign-in-integral`;
  const method = `GET`;

  const headers = {
    Connection: savedHeaders["Connection"] || `keep-alive`,
    "Accept-Encoding": savedHeaders["Accept-Encoding"] || `gzip, deflate, br`,
    Accept: savedHeaders["Accept"] || `*/*`,
    "Accept-Language": savedHeaders["Accept-Language"] || `zh-CN,zh-Hans;q=0.9`,
    Host: savedHeaders["Host"] || `app.cdmetro.chengdurail.cn`,
    "User-Agent": savedHeaders["User-Agent"] || `CDMetro`,
    "system-version": savedHeaders["system-version"] || ``,
    system: savedHeaders["system"] || ``,
    "app-version": savedHeaders["app-version"] || ``,
    appVersion: savedHeaders["appVersion"] || ``,
    "device-id": savedHeaders["device-id"] || savedHeaders["deviceId"] || ``,
    deviceId: savedHeaders["deviceId"] || savedHeaders["device-id"] || ``,
    source: savedHeaders["source"] || ``,
    vendor: savedHeaders["vendor"] || ``,
    language: savedHeaders["language"] || ``,
    user: savedHeaders["user"] || ``,
    token: savedHeaders["token"] || ``,
    "app-token": savedHeaders["app-token"] || ``,
    Cookie: savedHeaders["Cookie"] || ``,
  };

  const myRequest = { url, method, headers };

  $task.fetch(myRequest).then(
    (resp) => {
      const status = resp.statusCode;
      const body = resp.body || "";

      let msg = "";
      let code = "";
      let integralIncrement;
      try {
        const obj = JSON.parse(body);
        msg = obj?.message
          ? String(obj.message)
          : obj?.msg
            ? String(obj.msg)
            : "";
        code =
          obj?.code !== undefined
            ? String(obj.code)
            : obj?.status !== undefined
              ? String(obj.status)
              : "";
        integralIncrement = obj?.data?.integralIncrement;
        console.log(
          `[CDRail] status=${status} code=${code || "(empty)"} msg=${msg || "(empty)"} integralIncrement=${
            integralIncrement !== undefined ? String(integralIncrement) : "(empty)"
          }`
        );
      } catch (e) {
        console.log(`[CDRail] JSON parse failed: ${e}; raw body=${body}`);
      }

      if (status === 401 || status === 403) {
        const content = msg || body || `鉴权失败，status=${status}`;
        $notify("成都地铁", "登录失效", `HTTP ${status}，请重新抓包保存请求头。\n${content}`);
      } else if (status >= 200 && status < 300) {
        if (code === "0" && (msg === "SUCCESS" || msg === "")) {
          const inc =
            integralIncrement !== undefined ? String(integralIncrement) : "";
          const content = inc ? `获得积分 +${inc}` : "签到成功";
          $notify("成都地铁", "签到成功", content);
        } else if (code === "1102") {
          $notify("成都地铁", "今日已签到", msg || "请勿重复签到！");
        } else {
          const content = `${msg || "未知返回"}${code ? ` (code=${code})` : ""}`;
          $notify("成都地铁", "返回异常", content);
        }
      } else {
        const content = msg || body || `请求失败，status=${status}`;
        $notify("成都地铁", `接口异常 ${status}`, content);
      }

      $done();
    },
    (reason) => {
      const err = reason?.error ? String(reason.error) : String(reason || "");
      console.log(`[CDRail] request error: ${err}`);
      $notify("成都地铁", "网络错误", err);
      $done();
    }
  );
}
