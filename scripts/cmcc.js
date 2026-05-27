/******************************
脚本功能：中国移动 自动签到领奖
更新时间：2026-05-13
使用说明：先访问中国移动签到页面保存 Cookie，再由定时任务自动签到领奖。

[rewrite_local]
^https?:\/\/wx\.10086\.cn\/qwhdhub\/ url script-request-header https://raw.githubusercontent.com/curtinp118/QuantumultX/refs/heads/main/scripts/cmcc.js

[task_local]
35 8 * * * https://raw.githubusercontent.com/curtinp118/QuantumultX/refs/heads/main/scripts/cmcc.js, tag=中国移动签到, enabled=true

[MITM]
hostname = %APPEND% wx.10086.cn
*******************************/

const COOKIE_KEY = "CMCC_Cookie";
const HOST = "wx.10086.cn";
const BASE_URL = "https://wx.10086.cn/qwhdhub/api/mark/mark31";
const REFERER = "https://wx.10086.cn/qwhdhub/qwhdmark/1021122301?channelId=P00000109876";
const USER_AGENT = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148/wkwebview leadeon/12.0.6/CMCCIT";

const isGetHeader = typeof $request !== "undefined";

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
    console.log("[CMCC] Error reading cookie:", e);
    return "";
  }
}

function saveCookie(cookie) {
  try {
    if (typeof $prefs === "undefined" || !cookie) return false;
    if (!cookie.includes("QWHD_SESSION_TOKEN")) return false;

    const oldCookie = getStoredCookie();

    if (oldCookie !== cookie) {
      $prefs.setValueForKey(cookie, COOKIE_KEY);
      console.log("[CMCC] Cookie saved successfully");
      return true;
    }

    return false;
  } catch (e) {
    console.log("[CMCC] Error saving cookie:", e);
    return false;
  }
}

function getDateString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function makeHeaders(cookie) {
  return {
    Host: HOST,
    Accept: "*/*",
    "Content-Type": "application/json;charset=UTF-8",
    Origin: `https://${HOST}`,
    Referer: REFERER,
    "login-check": "1",
    "x-requested-with": "XMLHttpRequest",
    "User-Agent": USER_AGENT,
    Cookie: cookie,
  };
}

function fetchUrl(url, options = {}) {
  return new Promise((resolve, reject) => {
    const defaultOptions = {
      url,
      method: options.method || "GET",
      headers: options.headers || {},
    };
    if (options.body) {
      defaultOptions.body = options.body;
    }
    $task.fetch(defaultOptions).then(
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
    console.log("[CMCC] Cookie not found in request headers");
    return $done({});
  }

  const saved = saveCookie(cookie);
  if (saved) {
    console.log("[CMCC] Cookie captured and updated");
    $notify("中国移动", "Cookie 已更新", "后续将用于自动签到领奖");
  }

  $done({});
} else {
  (async () => {
    const storedCookie = getStoredCookie();

    if (!storedCookie) {
      console.log("[CMCC] No stored cookie found");
      $notify("中国移动", "未获取到 Cookie", "请先打开移动 App 进入签到页面");
      return $done();
    }

    try {
      const headers = makeHeaders(storedCookie);
      const today = getDateString();

      // 签到
      console.log("[CMCC] Performing checkin for date:", today);
      const signInResp = await fetchUrl(`${BASE_URL}/domark`, {
        method: "POST",
        headers,
        body: JSON.stringify({ date: today }),
      });

      const signInData = safeJsonParse(signInResp);
      if (!signInData) {
        console.log("[CMCC] ✗签到失败 | 响应解析错误");
        $notify("中国移动签到失败", "响应解析错误", "");
        return $done();
      }

      if (!signInData.success && signInData.code !== "SUCCESS") {
        console.log(`[CMCC] ✗签到失败 | ${signInData.msg || signInData.code}`);
        $notify("中国移动签到失败", signInData.msg || signInData.code || "", "");
        return $done();
      }

      const awards = (signInData.data && signInData.data.taskAwardChance) || [];
      let notifyTitle = "中国移动签到成功";
      let notifySubtitle = signInData.msg || "已签到";

      if (awards.length > 0) {
        // 领取奖励
        const awardId = awards[0].id;
        console.log("[CMCC] Award found, claiming award with ID:", awardId);

        const awardResp = await fetchUrl(`${BASE_URL}/taskAward/${awardId}`, {
          method: "POST",
          headers,
          body: "{}",
        });

        const awardData = safeJsonParse(awardResp);
        if (awardData && awardData.success) {
          const prize = (awardData.data && awardData.data.prizeName) || "奖励已领取";
          notifyTitle = "中国移动签到+领奖成功";
          notifySubtitle = prize;
          console.log(`[CMCC] ✓签到+领奖成功 | ${prize}`);
        } else {
          console.log("[CMCC] ✓签到成功，但领奖失败");
        }
      } else {
        console.log("[CMCC] ✓签到成功 | 无可领取奖励");
      }

      $notify(notifyTitle, "", notifySubtitle);
    } catch (e) {
      const errMsg = e?.error ? String(e.error) : String(e?.message || e || "Unknown error");
      console.log(`[CMCC] ✗网络错误 | ${errMsg}`);
      $notify("中国移动网络错误", "", errMsg);
    }

    $done();
  })();
}