// ===========================================================
// توابع کمکی برای صحبت با GitHub Contents API
// (به‌جای فایربیس، خودِ ریپوی گیت‌هاب به‌عنوان دیتابیس و فضای ذخیره استفاده می‌شه)
// ===========================================================

const GH_API_ROOT = "https://api.github.com";

function ghHeaders(token){
  return {
    "Authorization": `Bearer ${token}`,
    "Accept": "application/vnd.github+json"
  };
}

function ghContentsUrl(path){
  return `${GH_API_ROOT}/repos/${GH_CONFIG.owner}/${GH_CONFIG.repo}/contents/${path}`;
}

// تبدیل رشته‌ی فارسی/یونیکد به base64 (برای فایل JSON متنی)
function utf8ToBase64(str){
  return btoa(unescape(encodeURIComponent(str)));
}
// برعکسش — گرفتن متن خوانا از base64 برگشتی گیت‌هاب
function base64ToUtf8(str){
  return decodeURIComponent(escape(atob(str.replace(/\n/g, ""))));
}

// خواندن یک فایل از ریپو. اگر وجود نداشت null برمی‌گردونه.
async function ghGetFile(path, token){
  const res = await fetch(`${ghContentsUrl(path)}?ref=${GH_CONFIG.branch}`, { headers: ghHeaders(token) });
  if (res.status === 404) return null;
  if (!res.ok){
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `خطای گیت‌هاب (${res.status})`);
  }
  const data = await res.json();
  return { sha: data.sha, content: base64ToUtf8(data.content) };
}

// ساخت یا به‌روزرسانی یک فایل. base64Content باید از قبل base64 شده باشه.
async function ghPutFile(path, base64Content, message, sha, token){
  const body = { message, content: base64Content, branch: GH_CONFIG.branch };
  if (sha) body.sha = sha;
  const res = await fetch(ghContentsUrl(path), {
    method: "PUT",
    headers: ghHeaders(token),
    body: JSON.stringify(body)
  });
  if (!res.ok){
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `خطای گیت‌هاب (${res.status})`);
  }
  return res.json();
}

async function ghDeleteFile(path, sha, message, token){
  const res = await fetch(ghContentsUrl(path), {
    method: "DELETE",
    headers: ghHeaders(token),
    body: JSON.stringify({ message, sha, branch: GH_CONFIG.branch })
  });
  if (!res.ok){
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `خطای گیت‌هاب (${res.status})`);
  }
  return res.json();
}

// خواندن یک فایل (zip یا عکس) از ورودی <input type="file"> و گرفتن base64 خامش
function fileToBase64(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// تست معتبر بودن توکن + دسترسی به همین ریپو
// (به فیلد permissions تکیه نمی‌کنیم چون توکن‌های fine-grained همیشه برش نمی‌گردونن)
async function ghVerifyToken(token){
  const res = await fetch(`${GH_API_ROOT}/repos/${GH_CONFIG.owner}/${GH_CONFIG.repo}`, { headers: ghHeaders(token) });
  if (res.status === 401 || res.status === 403){
    throw new Error("توکن نامعتبره یا منقضی شده.");
  }
  if (!res.ok){
    throw new Error(`دسترسی به ریپو ممکن نشد (کد ${res.status}). owner/repo توی config.js رو چک کن.`);
  }
  return true;
}
