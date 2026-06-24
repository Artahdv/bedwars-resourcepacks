// ===========================================================
// منطق پنل مدیریت — به‌جای فایربیس از GitHub API استفاده می‌شه.
// «ورود» یعنی وارد کردن یک توکن دسترسی گیت‌هاب که فقط خودت داری.
// ===========================================================

const TOKEN_KEY = "bw_admin_token";

const loginCard   = document.getElementById("loginCard");
const panelCard   = document.getElementById("panelCard");
const loginForm   = document.getElementById("loginForm");
const loginError  = document.getElementById("loginError");
const logoutBtn   = document.getElementById("logoutBtn");

const uploadForm  = document.getElementById("uploadForm");
const uploadError = document.getElementById("uploadError");
const uploadSuccess = document.getElementById("uploadSuccess");
const progressTrack = document.getElementById("progressTrack");
const progressBar   = document.getElementById("progressBar");
const submitBtn    = document.getElementById("submitBtn");
const adminList    = document.getElementById("adminList");

function getToken(){ return sessionStorage.getItem(TOKEN_KEY); }
function setToken(t){ sessionStorage.setItem(TOKEN_KEY, t); }
function clearToken(){ sessionStorage.removeItem(TOKEN_KEY); }

// ---------- ورود ----------
async function showPanelIfLoggedIn(){
  const token = getToken();
  if (!token){
    loginCard.style.display = "block";
    panelCard.style.display = "none";
    return;
  }
  try{
    await ghVerifyToken(token);
    loginCard.style.display = "none";
    panelCard.style.display = "block";
    loadAdminList();
  } catch (err){
    clearToken();
    loginCard.style.display = "block";
    panelCard.style.display = "none";
    loginError.textContent = err.message;
  }
}

loginForm.addEventListener("submit", async e => {
  e.preventDefault();
  loginError.textContent = "";
  const token = document.getElementById("token").value.trim();
  if (!token){ loginError.textContent = "توکن رو وارد کن."; return; }
  try{
    await ghVerifyToken(token);
    setToken(token);
    showPanelIfLoggedIn();
  } catch (err){
    loginError.textContent = err.message;
  }
});

logoutBtn.addEventListener("click", () => {
  clearToken();
  showPanelIfLoggedIn();
});

// ---------- آپلود ----------
uploadForm.addEventListener("submit", async e => {
  e.preventDefault();
  uploadError.textContent = "";
  uploadSuccess.textContent = "";

  const token = getToken();
  const title = document.getElementById("title").value.trim();
  const category = document.getElementById("category").value.trim();
  const description = document.getElementById("description").value.trim();
  const packFile = document.getElementById("packFile").files[0];
  const imageFile = document.getElementById("imageFile").files[0];

  if (!title || !category || !packFile){
    uploadError.textContent = "عنوان، دسته‌بندی و فایل ریسورس‌پک الزامی هستند.";
    return;
  }
  if (packFile.size > 25 * 1024 * 1024){
    uploadError.textContent = "فایل بزرگ‌تر از ۲۵ مگابایته — گیت‌هاب API این حجم رو قبول نمی‌کنه.";
    return;
  }

  submitBtn.disabled = true;
  progressTrack.style.display = "block";
  setProgress(15);

  try{
    const stamp = Date.now();
    const packPath = `${GH_CONFIG.uploadsFolder}/${stamp}_${sanitizeName(packFile.name)}`;
    const packB64 = await fileToBase64(packFile);
    setProgress(35);
    await ghPutFile(packPath, packB64, `افزودن ریسورس‌پک: ${title}`, null, token);
    setProgress(60);

    let imagePath = "";
    if (imageFile){
      imagePath = `${GH_CONFIG.uploadsFolder}/${stamp}_${sanitizeName(imageFile.name)}`;
      const imgB64 = await fileToBase64(imageFile);
      await ghPutFile(imagePath, imgB64, `افزودن تصویر برای: ${title}`, null, token);
    }
    setProgress(80);

    // به‌روزرسانی data/packs.json
    const current = await ghGetFile(GH_CONFIG.dataPath, token);
    const list = current ? JSON.parse(current.content) : [];
    list.unshift({
      id: String(stamp),
      title, category, description,
      fileURL: packPath,
      imageURL: imagePath,
      sizeLabel: formatSize(packFile.size),
      createdAt: new Date().toISOString()
    });
    await ghPutFile(
      GH_CONFIG.dataPath,
      utf8ToBase64(JSON.stringify(list, null, 2)),
      `به‌روزرسانی لیست پک‌ها: ${title}`,
      current ? current.sha : null,
      token
    );

    setProgress(100);
    uploadSuccess.textContent = "ریسورس‌پک با موفقیت اضافه شد ✅ (ممکنه چند ثانیه طول بکشه تا روی سایت دیده شه)";
    uploadForm.reset();
    loadAdminList();
  } catch (err){
    console.error(err);
    uploadError.textContent = "آپلود با خطا مواجه شد: " + err.message;
  } finally{
    submitBtn.disabled = false;
    setTimeout(() => { progressTrack.style.display = "none"; setProgress(0); }, 900);
  }
});

function setProgress(pct){ progressBar.style.width = Math.min(pct, 100) + "%"; }

function sanitizeName(name){
  return name.replace(/\s+/g, "_").replace(/[^\w.\-آ-ی]/g, "");
}

function formatSize(bytes){
  if (bytes < 1024*1024) return (bytes/1024).toFixed(0) + " KB";
  return (bytes/1024/1024).toFixed(1) + " MB";
}

// ---------- لیست + حذف ----------
async function loadAdminList(){
  adminList.innerHTML = "در حال بارگذاری…";
  try{
    const token = getToken();
    const current = await ghGetFile(GH_CONFIG.dataPath, token);
    const list = current ? JSON.parse(current.content) : [];
    if (list.length === 0){
      adminList.innerHTML = `<p style="color:var(--muted)">هنوز هیچ ریسورس‌پکی اضافه نشده.</p>`;
      return;
    }
    adminList.innerHTML = "";
    list.forEach(p => {
      const row = document.createElement("div");
      row.className = "admin-item";
      row.innerHTML = `
        <div class="meta">
          <b>${escapeHTML(p.title)}</b>
          <span>${escapeHTML(p.category)} · ${p.sizeLabel || ""}</span>
        </div>
        <button class="btn-danger" data-id="${p.id}">حذف</button>
      `;
      row.querySelector("button").addEventListener("click", () => deletePack(p.id));
      adminList.appendChild(row);
    });
  } catch (err){
    adminList.innerHTML = `<p style="color:var(--redstone)">خطا در بارگذاری لیست: ${escapeHTML(err.message)}</p>`;
  }
}

async function deletePack(id){
  if (!confirm("این ریسورس‌پک از لیست سایت حذف شود؟ (فایل آپلودشده در ریپو باقی می‌ماند)")) return;
  const token = getToken();
  try{
    const current = await ghGetFile(GH_CONFIG.dataPath, token);
    const list = current ? JSON.parse(current.content) : [];
    const updated = list.filter(p => p.id !== id);
    await ghPutFile(
      GH_CONFIG.dataPath,
      utf8ToBase64(JSON.stringify(updated, null, 2)),
      `حذف یک ریسورس‌پک`,
      current.sha,
      token
    );
    loadAdminList();
  } catch (err){
    alert("حذف با خطا مواجه شد: " + err.message);
  }
}

function escapeHTML(str=""){
  return str.replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
}

showPanelIfLoggedIn();
