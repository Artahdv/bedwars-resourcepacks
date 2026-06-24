// ===========================================================
// منطق صفحه‌ی اصلی سایت — داده‌ها از data/packs.json خونده می‌شن
// ===========================================================

const CATEGORY_ICONS = {
  "همه": "🟪",
  "بلوک‌ها": "🧱",
  "آیتم‌ها": "🗡️",
  "PvP": "⚔️",
  "FPS بوست": "⚡",
  "صدا": "🔊",
  "کامل": "🎒"
};

// داده‌ی نمونه — فقط وقتی نشون داده می‌شه که data/packs.json هنوز خالیه
// یا در دسترس نیست، تا ظاهر سایت رو از همین الان ببینی.
const DEMO_PACKS = [
  { title:"بلوک‌های شیشه‌ای واضح", category:"بلوک‌ها", description:"شیشه‌ی کاملاً شفاف برای دید بهتر داخل تخت‌ها.", fileURL:"#", sizeLabel:"1.2 MB" },
  { title:"PvP کلاسیک قرمز", category:"PvP", description:"تکسچر شمشیر و زره با کنتراست بالا برای دید بهتر در نبرد.", fileURL:"#", sizeLabel:"3.4 MB" },
  { title:"بوست FPS سبک", category:"FPS بوست", description:"حذف افکت‌های اضافه و کاهش رزولوشن تکسچرها برای گیمینگ روان.", fileURL:"#", sizeLabel:"0.8 MB" },
  { title:"صدای ضربه‌ی واضح", category:"صدا", description:"صدای شکستن بلوک و ضربه‌ی شمشیر شفاف‌تر و قابل تشخیص‌تر.", fileURL:"#", sizeLabel:"2.1 MB" },
  { title:"پک کامل تورنومنتی", category:"کامل", description:"ترکیبی از بهترین تکسچرهای PvP، بلوک و GUI برای رقابت‌های جدی.", fileURL:"#", sizeLabel:"6.7 MB" },
  { title:"آیتم‌های مینیمال", category:"آیتم‌ها", description:"آیکون‌های ساده و تمیز برای تشخیص سریع‌تر آیتم‌ها در اینونتوری.", fileURL:"#", sizeLabel:"1.5 MB" }
];

let allPacks = [];
let activeCategory = "همه";

const grid = document.getElementById("grid");
const hotbar = document.getElementById("hotbar");
const notice = document.getElementById("notice");

async function loadPacks(){
  try{
    const res = await fetch(`${GH_CONFIG.dataPath}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error("data/packs.json پیدا نشد");
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0){
      allPacks = DEMO_PACKS;
      showNotice("هنوز هیچ ریسورس‌پکی از پنل مدیریت اضافه نشده — این‌ها داده‌ی نمونه هستند.");
    } else {
      allPacks = data;
    }
  } catch (err){
    console.warn("خطا در خوندن لیست پک‌ها:", err.message);
    allPacks = DEMO_PACKS;
    showNotice("لیست ریسورس‌پک‌ها هنوز در دسترس نیست — این‌ها داده‌ی نمونه هستند.");
  }
  buildHotbar();
  renderGrid();
}

function showNotice(text){
  notice.textContent = text;
  notice.style.display = "block";
}

function buildHotbar(){
  const cats = ["همه", ...new Set(allPacks.map(p => p.category))];
  hotbar.innerHTML = "";
  cats.forEach(cat => {
    const slot = document.createElement("button");
    slot.className = "hotbar-slot" + (cat === activeCategory ? " active" : "");
    slot.innerHTML = `<span class="icon">${CATEGORY_ICONS[cat] || "📦"}</span><span class="label">${cat}</span>`;
    slot.addEventListener("click", () => {
      activeCategory = cat;
      document.querySelectorAll(".hotbar-slot").forEach(s => s.classList.remove("active"));
      slot.classList.add("active");
      renderGrid();
    });
    hotbar.appendChild(slot);
  });
}

function renderGrid(){
  const items = activeCategory === "همه"
    ? allPacks
    : allPacks.filter(p => p.category === activeCategory);

  if (items.length === 0){
    grid.innerHTML = `<div class="empty-state">چیزی در این دسته پیدا نشد.</div>`;
    return;
  }

  grid.innerHTML = items.map(p => `
    <div class="pack-card">
      <div class="pack-thumb">
        ${p.imageURL ? `<img src="${p.imageURL}" alt="${escapeHTML(p.title)}">` : "🧊"}
      </div>
      <div class="pack-body">
        <span class="pack-tag">${escapeHTML(p.category)}</span>
        <h3 class="pack-title">${escapeHTML(p.title)}</h3>
        <p class="pack-desc">${escapeHTML(p.description || "")}</p>
        <div class="pack-meta">
          <span>${p.sizeLabel || ""}</span>
        </div>
        <a class="btn-download" href="${p.fileURL}" target="_blank" rel="noopener" download>دانلود ریسورس‌پک</a>
      </div>
    </div>
  `).join("");
}

function escapeHTML(str=""){
  return str.replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
}

loadPacks();
