

/******************************
脚本功能：V2EX 每日签到
更新时间：2026-04-29
使用说明：先访问 V2EX 个人主页保存 Cookie，再由定时任务自动签到。

[rewrite_local]
^https:\/\/www\.v2ex\.com\/ url script-request-header https://raw.githubusercontent.com/curtinp118/QuantumultX/refs/heads/main/scripts/V2EX.js

[task_local]
10 9 * * * https://raw.githubusercontent.com/curtinp118/QuantumultX/refs/heads/main/scripts/V2EX.js, tag=V2EX 每日签到, enabled=true

[MITM]
hostname = %APPEND% www.v2ex.com
*******************************/

const COOKIE_KEY = "V2EX_Cookie";
const HOST = "www.v2ex.com";
const isGetHeader = typeof $request !== "undefined";

const NEED_HEADERS = ["Cookie", "User-Agent", "Referer"];

function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch (_) {
    return null;
  }
}

function getStoredCookie() {
  try {
    if (typeof $prefs === "undefined") return "";
    const cookie = $prefs.valueForKey(COOKIE_KEY);
    return cookie ? String(cookie).trim() : "";
  } catch (e) {
    console.log("[V2EX] Error reading cookie:", e);
    return "";
  }
}

function saveCookie(cookie) {
  try {
    if (typeof $prefs === "undefined" || !cookie) return false;
    const oldCookie = getStoredCookie();
    if (oldCookie !== cookie) {
      $prefs.setValueForKey(cookie, COOKIE_KEY);
      console.log("[V2EX] Cookie saved successfully");
      return true;
    }
    return false;
  } catch (e) {
    console.log("[V2EX] Error saving cookie:", e);
    return false;
  }
}

function pickNeedHeaders(src = {}) {
  const dst = {};
  const lowerMap = {};
  for (const k of Object.keys(src || {})) {
    lowerMap[String(k).toLowerCase()] = src[k];
  }
  const get = (name) => src[name] ?? lowerMap[String(name).toLowerCase()];
  for (const k of NEED_HEADERS) {
    const v = get(k);
    if (v !== undefined) {
      dst[k] = v;
    }
  }
  return dst;
}

function formatBalance(html) {
  try {
    if (!html) return "";
    const balanceBlock = html.match(/balance_area bigger[\s\S]*?<\/div>/);
    if (!balanceBlock) return "";

    const gold = (balanceBlock[0].match(/(\d+)\s*<img[^>]*alt="G"/) || [])[1];
    const silver = (balanceBlock[0].match(/(\d+)\s*<img[^>]*alt="S"/) || [])[1];
    const bronze = (balanceBlock[0].match(/(\d+)\s*<img[^>]*alt="B"/) || [])[1];

    let result = "";
    if (gold) result += gold + "金";
    if (silver) result += silver + "银";
    if (bronze) result += bronze + "铜";
    return result;
  } catch (e) {
    console.log("[V2EX] Error parsing balance:", e);
    return "";
  }
}

function fetchUrl(url, headers) {
  return new Promise((resolve, reject) => {
    $task.fetch({ url, headers, method: "GET" }).then(
      (resp) => {
        resolve(resp.body || "");
      },
      (reason) => {
        reject(reason);
      }
    );
  });
}

if (isGetHeader) {
  const allHeaders = $request.headers || {};
  const cookie = allHeaders.Cookie || allHeaders.cookie || "";

  if (!cookie) {
    console.log("[V2EX] Cookie not found in request headers");
    $done({});
  }

  const saved = saveCookie(cookie);
  if (saved) {
    console.log("[V2EX] Cookie captured and updated");
    $notify("V2EX", "Cookie 已更新", "后续将用于自动签到");
  }

  $done({});
} else {
  (async () => {
    const storedCookie = getStoredCookie();

    if (!storedCookie) {
      console.log("[V2EX] No stored cookie found");
      $notify("V2EX", "未获取到 Cookie", "请先访问 V2EX 个人主页");
      return $done();
    }

    try {
      const headers = {
        Cookie: storedCookie,
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
        Referer: "https://www.v2ex.com/mission/daily",
      };

      // 获取每日签到页面
      const dailyPageHtml = await fetchUrl("https://www.v2ex.com/mission/daily", headers);

      if (dailyPageHtml.includes("需要先登录")) {
        console.log("[V2EX] Cookie expired - login required");
        $notify("V2EX", "Cookie 已失效", "HTTP 401，请重新访问 V2EX 更新 Cookie");
        return $done();
      }

      // 提取连续登录天数
      const daysMatch = dailyPageHtml.match(/已连续登录\s*(\d+)\s*天/);
      const days = daysMatch ? daysMatch[1] : "?";

      // 检查是否已签到
      const onceMatch = dailyPageHtml.match(/redeem\?once=(\d+)/);
      const once = onceMatch ? onceMatch[1] : "";

      if (once) {
        // 执行签到
        console.log("[V2EX] Performing checkin with once code:", once);
        await fetchUrl(`https://www.v2ex.com/mission/daily/redeem?once=${once}`, headers);

        // 重新获取页面确认签到
        const confirmPageHtml = await fetchUrl("https://www.v2ex.com/mission/daily", headers);
        const confirmDaysMatch = confirmPageHtml.match(/已连续登录\s*(\d+)\s*天/);
        const confirmDays = confirmDaysMatch ? confirmDaysMatch[1] : days;

        // 获取奖励信息
        const balancePageHtml = await fetchUrl("https://www.v2ex.com/balance", headers);
        const rewardMatch = balancePageHtml.match(/每日登录奖励\s*([+-]?\d+)\s*铜币/);
        const reward = rewardMatch ? rewardMatch[1] : "";

        const logMsg = `[V2EX] ✓成功 | 连续 ${confirmDays} 天${reward ? ` | 奖励 ${reward} 铜币` : ""}`;
        console.log(logMsg);

        let notifyContent = `连续签到 ${confirmDays} 天`;
        if (reward) {
          notifyContent += `\n获得 ${reward} 铜币`;
        }
        $notify("V2EX 签到成功", "", notifyContent);
      } else if (dailyPageHtml.includes("每日登录奖励已领取")) {
        // 已经签到过
        const balancePageHtml = await fetchUrl("https://www.v2ex.com/balance", headers);
        const balance = formatBalance(balancePageHtml);

        const logMsg = `[V2EX] ✓已签到 | 连续 ${days} 天${balance ? ` | 余额 ${balance}` : ""}`;
        console.log(logMsg);

        let notifyContent = `连续签到 ${days} 天`;
        if (balance) {
          notifyContent += `\n余额 ${balance}`;
        }
        $notify("V2EX 今日已签到", "", notifyContent);
      } else {
        console.log("[V2EX] ✗签到失败 | 未找到 once 码");
        $notify("V2EX 签到失败", "未找到 once 码", "请检查页面是否加载正常");
      }
    } catch (e) {
      const errMsg = e?.error ? String(e.error) : String(e?.message || e || "Unknown error");
      console.log(`[V2EX] ✗网络错误 | ${errMsg}`);
      $notify("V2EX 网络错误", "", errMsg);
    }

    $done();
  })();
}