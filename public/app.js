(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  let state = {
    config: null,
    products: [],
    filter: "all",
    search: "",
    sort: "default",
    favOnly: false,
    favorites: new Set(JSON.parse(localStorage.getItem("cats_favs") || "[]")),
    reviewRating: 5,
    knownDelivered: new Set(),
    couponCode: "",
    couponInfo: null,
    orderFilter: "all",
    ordersCache: [],
  };

  function saveFavs() {
    localStorage.setItem("cats_favs", JSON.stringify([...state.favorites]));
  }

  const HOT_IDS = new Set(["starter", "6767", "peak", "all-in-one", "cats-toward"]);

  const fmt = (n) => Number(n || 0).toLocaleString("ko-KR");
  const timeAgo = (iso) => {
    if (!iso) return "";
    const d = (Date.now() - new Date(iso).getTime()) / 1000;
    if (d < 60) return "방금";
    if (d < 3600) return `${Math.floor(d / 60)}분 전`;
    if (d < 86400) return `${Math.floor(d / 3600)}시간 전`;
    return `${Math.floor(d / 86400)}일 전`;
  };

  const statusLabel = {
    awaiting_credentials: { text: "세이브코드 입력 대기", cls: "status-pending" },
    credentials_submitted: { text: "처리 대기", cls: "status-pending" },
    processing: { text: "처리 중", cls: "status-ok" },
    completed: { text: "완료", cls: "status-done" },
    cancelled: { text: "취소됨", cls: "status-cancel" },
  };

  function toast(msg, type = "") {
    const t = $("#toast");
    t.textContent = msg;
    t.className = "toast show" + (type ? ` ${type}` : "");
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove("show"), 3200);
  }

  async function api(path, opts = {}) {
    const res = await fetch(path, {
      headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
      credentials: "same-origin",
      ...opts,
      body: opts.body != null ? JSON.stringify(opts.body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || `요청 실패 (${res.status})`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  function openModal(id) { $(id).classList.remove("hidden"); }
  function closeModals() { $$(".modal").forEach((m) => m.classList.add("hidden")); }
  $$("[data-close]").forEach((el) => el.addEventListener("click", closeModals));

  function showSection(name) {
    $$(".section").forEach((s) => s.classList.add("hidden"));
    const sec = $(`#section-${name}`);
    if (sec) sec.classList.remove("hidden");
    $$(".nav-btn, .mobile-nav button[data-section]").forEach((b) =>
      b.classList.toggle("active", b.dataset.section === name)
    );
    if (name === "orders") loadOrders();
    if (name === "reviews") loadReviews();
    if (name === "support") loadSupport();
    if (name === "notices") loadNotices();
    if (name === "shop") renderProducts();
    if (name === "vip") loadVip();
    history.replaceState(null, "", name === "shop" ? "#" : `#${name}`);
  }

  $$("[data-section]").forEach((btn) =>
    btn.addEventListener("click", () => showSection(btn.dataset.section))
  );

  // FAQ
  $$(".faq-q").forEach((q) =>
    q.addEventListener("click", () => {
      const item = q.closest(".faq-item");
      item.classList.toggle("open");
    })
  );

  async function loadConfig() {
    state.config = await api("/api/config");
    renderAuth();
  }

  function renderAuth() {
    const c = state.config;
    const logged = c?.loggedIn;
    $("#authArea").classList.toggle("hidden", logged);
    $("#userArea").classList.toggle("hidden", !logged);
    $("#walletBar").classList.toggle("hidden", !logged);
    if (logged) {
      $("#userName").textContent = c.user.username;
      let badge = $("#userVipBadge");
      if (!badge) {
        badge = document.createElement("span");
        badge.id = "userVipBadge";
        badge.className = "vip-badge hidden";
        $("#userName").after(badge);
      }
      if (c.vip && c.vip.level >= 1) {
        badge.textContent = `👑 VIP${c.vip.level}`;
        badge.classList.remove("hidden");
      } else {
        badge.classList.add("hidden");
      }
      const label = String(c.user.username||"냥").slice(0,1);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="32" fill="#3b82f6"/><text x="32" y="39" text-anchor="middle" font-size="28" font-family="Arial, sans-serif" fill="white">${label}</text></svg>`;
      $("#userAvatar").src = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
      $("#adminLink").classList.toggle("hidden", !c.isAdmin);
      loadWallet();
    }
    if (c?.social) {
      $("#spToday").textContent = c.social.todayBuys || 0;
      $("#spRating").textContent = c.social.avgRating || 5;
      $("#spReviews").textContent = c.social.reviewCount || 0;
      $("#spOrders").textContent = c.social.totalOrders || 0;
    }
    if (c?.etaText) $("#spEta").textContent = "⏱ " + c.etaText;
    if (c?.hoursNote && $("#hoursNote")) $("#hoursNote").textContent = "⏰ " + c.hoursNote;
    const com = $("#spCommunity");
    if (c?.communityUrl) {
      com.href = c.communityUrl;
      com.classList.remove("hidden");
    } else com.classList.add("hidden");
  }

  async function loadWallet() {
    try {
      const w = await api("/api/wallet");
      $("#balanceText").textContent = `${fmt(w.balance)}원`;
    } catch {}
  }

  async function loadProducts() {
    state.products = await api("/api/products");
    renderProducts();
  }

  function renderProducts() {
    const grid = $("#productGrid");
    const q = state.search.trim().toLowerCase();
    let list = state.products.filter((p) => {
      if (state.filter !== "all" && p.category !== state.filter) return false;
      if (state.favOnly && !state.favorites.has(p.id)) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q) ||
        (p.contents || []).join(" ").toLowerCase().includes(q)
      );
    });
    if (state.sort === "price_asc") list = [...list].sort((a,b)=>a.price-b.price);
    else if (state.sort === "price_desc") list = [...list].sort((a,b)=>b.price-a.price);
    else if (state.sort === "name") list = [...list].sort((a,b)=>a.name.localeCompare(b.name,"ko"));
    else list = [...list].sort((a,b)=>(HOT_IDS.has(b.id)?1:0)-(HOT_IDS.has(a.id)?1:0) || a.price-b.price);

    if (!list.length) {
      grid.innerHTML = `<div class="empty">검색 결과가 없습니다.</div>`;
      return;
    }
    grid.innerHTML = list
      .map((p) => {
        const hot = HOT_IDS.has(p.id) ? `<span class="product-badge hot">인기</span>` : `<span class="product-badge">${p.badge || p.category}</span>`;
        const fav = state.favorites.has(p.id);
        return `
      <article class="product-card" data-id="${p.id}">
        <div class="product-top">
          <div class="product-icon">${p.icon || "🎁"}</div>
          <div style="display:flex;gap:6px;align-items:center">
            ${hot}
            <button class="btn btn-sm btn-ghost fav-btn" data-fav="${p.id}" title="찜하기">${fav ? "♥" : "♡"}</button>
          </div>
        </div>
        <div class="product-name">${escapeHtml(p.name)}</div>
        <div class="product-desc">${escapeHtml(p.description || "")}</div>
        <div class="product-footer">
          <div class="product-price">${fmt(p.price)}<span>원</span></div>
          <button class="btn btn-sm btn-accent">상세보기</button>
        </div>
      </article>`;
      })
      .join("");
    $$(".product-card", grid).forEach((card) =>
      card.addEventListener("click", (e) => {
        if (e.target.closest("[data-fav]")) return;
        openProduct(card.dataset.id);
      })
    );
    $$("[data-fav]", grid).forEach((b) =>
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = b.dataset.fav;
        if (state.favorites.has(id)) state.favorites.delete(id);
        else state.favorites.add(id);
        saveFavs();
        renderProducts();
      })
    );
  }

  $$(".chip[data-filter]").forEach((chip) =>
    chip.addEventListener("click", () => {
      state.filter = chip.dataset.filter;
      $$(".chip[data-filter]").forEach((c) => c.classList.toggle("active", c === chip));
      renderProducts();
    })
  );
  $("#productSearch")?.addEventListener("input", (e) => {
    state.search = e.target.value;
    renderProducts();
  });
  $("#productSort")?.addEventListener("change", (e) => {
    state.sort = e.target.value;
    renderProducts();
  });
  $("#btnFavOnly")?.addEventListener("click", () => {
    state.favOnly = !state.favOnly;
    $("#btnFavOnly").classList.toggle("active", state.favOnly);
    $("#btnFavOnly").textContent = state.favOnly ? "♥ 찜만" : "♡ 찜만";
    renderProducts();
  });

  $("#btnPointLogs")?.addEventListener("click", async () => {
    const box = $("#pointLogsBox");
    if (!box.classList.contains("hidden") && box.innerHTML) {
      box.classList.add("hidden");
      return;
    }
    try {
      const logs = await api("/api/wallet/logs");
      if (!logs.length) {
        box.innerHTML = `<div class="empty">포인트 내역이 없습니다.</div>`;
      } else {
        box.innerHTML = `<div class="glass" style="padding:14px">${logs.map(l => `
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:.88rem">
            <span>${escapeHtml(l.reason)} <span class="muted">${timeAgo(l.created_at)}</span></span>
            <strong style="color:${l.amount>=0?'var(--green)':'var(--danger)'}">${l.amount>=0?'+':''}${fmt(l.amount)}원</strong>
          </div>`).join("")}</div>`;
      }
      box.classList.remove("hidden");
    } catch (e) {
      toast(e.message, "error");
    }
  });

  function openProduct(id) {
    const p = state.products.find((x) => x.id === id);
    if (!p) return;
    state.couponCode = "";
    state.couponInfo = null;
    const contents = (p.contents || []).map((c) => `<li>${escapeHtml(c)}</li>`).join("");
    const eta = state.config?.etaText || "평균 10~30분 내 처리";
    const vipLv = state.config?.vip?.level || 0;
    const vipPct = state.config?.vip?.discount || 0;
    $("#productDetail").innerHTML = `
      <div class="detail-icon">${p.icon || "🎁"}</div>
      <span class="product-badge">${p.badge || ""}</span>
      <h2 style="margin-top:8px">${escapeHtml(p.name)}</h2>
      <p class="muted">${escapeHtml(p.description || "")}</p>
      <div class="detail-price" id="detailPrice">${fmt(p.price)}원</div>
      <p class="muted" style="margin-bottom:8px">⏱ ${escapeHtml(eta)}${vipLv>=1 ? ` · <span style=\"color:#b45309;font-weight:800\">VIP${vipLv} ${vipPct}% 할인 적용</span>` : ""}</p>
      <ul class="contents-list">${contents}</ul>
      ${(p.category==="character" || (p.name||"").includes("원하는")) ? `
      <label class="label">요청사항 (캐릭터명 등)</label>
      <input id="orderNote" class="input" placeholder="예: 캐릭터 이름 / 원하는 내용" maxlength="200" />
      ` : `<input type="hidden" id="orderNote" value="" />`}
      <label class="label">쿠폰 코드 (선택)</label>
      <div style="display:flex;gap:8px">
        <input id="couponInput" class="input" placeholder="쿠폰 코드" style="margin:0" />
        <button class="btn btn-accent" type="button" id="btnApplyCoupon">적용</button>
      </div>
      <p id="couponMsg" class="muted" style="margin-top:6px"></p>
      <button class="btn btn-primary btn-block" id="btnBuy" data-id="${p.id}">포인트로 구매하기</button>
    `;
    openModal("#modalProduct");
    $("#btnApplyCoupon")?.addEventListener("click", async () => {
      const code = $("#couponInput").value.trim();
      if (!code) return toast("쿠폰 코드를 입력하세요.", "error");
      try {
        const r = await api("/api/coupons/validate", { method: "POST", body: { code } });
        state.couponCode = r.code;
        state.couponInfo = r;
        let final = p.price;
        let disc = 0;
        if (r.type === "fixed") disc = Math.min(p.price - 100, r.value);
        else disc = Math.floor(p.price * Math.min(90, r.value) / 100);
        final = Math.max(100, p.price - Math.max(0, disc));
        $("#detailPrice").innerHTML = disc > 0
          ? `<span style="text-decoration:line-through;color:var(--muted);font-size:1rem;font-weight:600">${fmt(p.price)}원</span> ${fmt(final)}원 <span style="font-size:.85rem;color:var(--green)">-${fmt(disc)}</span>`
          : `${fmt(p.price)}원`;
        $("#couponMsg").textContent = `쿠폰 적용됨 · ${r.type === "fixed" ? fmt(r.value)+"원" : r.value+"%"} 할인`;
        toast("쿠폰이 적용되었습니다.", "success");
      } catch (e) {
        state.couponCode = "";
        state.couponInfo = null;
        $("#detailPrice").textContent = `${fmt(p.price)}원`;
        $("#couponMsg").textContent = e.message;
        toast(e.message, "error");
      }
    });
    $("#btnBuy")?.addEventListener("click", () => buyProduct(p.id));
  }

  async function buyProduct(id) {
    if (!state.config?.loggedIn) {
      toast("Discord 로그인이 필요합니다.", "error");
      return;
    }
    try {
      const note = $("#orderNote")?.value?.trim() || "";
      const r = await api("/api/orders", { method: "POST", body: { productId: id, couponCode: state.couponCode || undefined, note } });
      closeModals();
      toast("주문이 생성되었습니다! 세이브코드를 제출해주세요.", "success");
      loadWallet();
      showSection("orders");
      openCredsModal(r.order.order_no);
    } catch (e) {
      if (e.data?.needTopup) {
        toast(`잔액 부족 · 필요 ${fmt(e.data.required)}원 / 보유 ${fmt(e.data.balance)}원`, "error");
        openTopup();
      } else toast(e.message, "error");
    }
  }

  function openCredsModal(orderNo) {
    $("#credOrderNo").value = orderNo;
    $("#credSave").value = "";
    $("#credVer").value = "";
    openModal("#modalCreds");
  }

  $("#btnSubmitCreds").addEventListener("click", async () => {
    const no = $("#credOrderNo").value;
    try {
      await api(`/api/orders/${encodeURIComponent(no)}/credentials`, {
        method: "POST",
        body: {
          saveCode: $("#credSave").value.trim(),
          verificationCode: $("#credVer").value.trim(),
        },
      });
      closeModals();
      toast("세이브코드가 제출되었습니다. 처리가 완료되면 알려드릴게요!", "success");
      loadOrders();
    } catch (e) {
      toast(e.message, "error");
    }
  });

  function copyText(text) {
    navigator.clipboard?.writeText(text).then(
      () => toast("복사되었습니다.", "success"),
      () => toast("복사 실패", "error")
    );
  }

  async function loadOrders() {
    const list = $("#ordersList");
    if (!state.config?.loggedIn) {
      list.innerHTML = `<div class="empty">로그인 후 주문을 확인할 수 있습니다.</div>`;
      return;
    }
    try {
      const orders = await api("/api/orders");
      state.ordersCache = orders;
      renderOrdersList();
    } catch (e) {
      list.innerHTML = `<div class="empty">${escapeHtml(e.message)}</div>`;
    }
  }

  function renderOrdersList() {
    const list = $("#ordersList");
    const orders = state.ordersCache || [];
    if (!orders.length) {
      list.innerHTML = `<div class="empty">아직 주문이 없습니다.</div>`;
      return;
    }
    const f = state.orderFilter || "all";
    const filtered = orders.filter((o) => {
      if (f === "all") return true;
      if (f === "completed") return o.status === "completed";
      if (f === "cancelled") return o.status === "cancelled";
      if (f === "active") return !["completed", "cancelled"].includes(o.status);
      return true;
    });
    if (!filtered.length) {
      list.innerHTML = `<div class="empty">해당 주문이 없습니다.</div>`;
      return;
    }
      let hasNew = false;
      list.innerHTML = filtered
        .map((o) => {
          const st = statusLabel[o.status] || { text: o.status, cls: "status-pending" };
          const delivered =
            o.status === "completed" && (o.delivered_save_code || o.delivered_verification_code);
          if (delivered && !state.knownDelivered.has(o.order_no)) {
            hasNew = true;
            state.knownDelivered.add(o.order_no);
          }
          return `
          <div class="order-card">
            <div class="order-head">
              <div>
                <div class="order-title">${escapeHtml(o.product_name)}</div>
                <div class="order-no">${escapeHtml(o.order_no)} · ${fmt(o.amount)}원</div>
              </div>
              ${(o.vip_level||o.priority) ? `<span class="priority-tag">VIP${o.vip_level||o.priority}</span>` : ""}<span class="status ${st.cls}">${st.text}</span>
            </div>
            <div class="order-body">주문일 ${new Date(o.created_at).toLocaleString("ko-KR")}
              ${o.note?` · 요청: ${escapeHtml(o.note)}`:""}
              ${o.vip_discount?` · VIP할인 ${fmt(o.vip_discount)}원`:""}
            </div>
            ${
              delivered
                ? `<div class="order-codes">
                    <div>세이브코드</div>
                    <div class="code-row"><code>${escapeHtml(o.delivered_save_code)}</code>
                      <button class="btn btn-sm btn-accent" data-copy="${escapeHtml(o.delivered_save_code)}">복사</button></div>
                    <div style="margin-top:8px">인증번호</div>
                    <div class="code-row"><code>${escapeHtml(o.delivered_verification_code)}</code>
                      <button class="btn btn-sm btn-accent" data-copy="${escapeHtml(o.delivered_verification_code)}">복사</button></div>
                  </div>`
                : ""
            }
            <div class="order-actions">
              ${
                ["awaiting_credentials", "credentials_submitted"].includes(o.status)
                  ? `<button class="btn btn-sm btn-accent" data-creds="${escapeHtml(o.order_no)}">세이브코드 제출</button>`
                  : ""
              }
              ${o.product_id ? `<button class="btn btn-sm btn-outline" data-reorder="${escapeHtml(o.product_id)}">다시 구매</button>` : ""}
              <div class="muted" style="width:100%;font-size:.75rem;margin-top:4px">
                ${o.status==="awaiting_credentials"?"① 세이브코드 제출 대기":o.status==="credentials_submitted"?"② 관리자 처리 대기":o.status==="processing"?"③ 처리 중":o.status==="completed"?"④ 완료 · 코드 수령":o.status}
                ${o.discount?` · 쿠폰할인 ${fmt(o.discount)}원`:""}
              </div>
            </div>
          </div>`;
        })
        .join("");
      $$("[data-creds]", list).forEach((b) =>
        b.addEventListener("click", () => openCredsModal(b.dataset.creds))
      );
      $$("[data-copy]", list).forEach((b) =>
        b.addEventListener("click", () => copyText(b.dataset.copy))
      );
      $$("[data-reorder]", list).forEach((b) =>
        b.addEventListener("click", () => openProduct(b.dataset.reorder))
      );
      if (hasNew) showDeliverAlert();
  }

  function showDeliverAlert() {
    $("#deliverAlert").classList.remove("hidden");
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.value = 880;
      g.gain.value = 0.08;
      o.start();
      setTimeout(() => o.stop(), 180);
    } catch {}
  }
  $("#btnGoOrders").addEventListener("click", () => {
    $("#deliverAlert").classList.add("hidden");
    showSection("orders");
  });
  $("#btnDismissAlert").addEventListener("click", () =>
    $("#deliverAlert").classList.add("hidden")
  );

  async function loadActivity() {
    try {
      const items = await api("/api/activity");
      const ul = $("#activityList");
      if (!items.length) {
        ul.innerHTML = `<li class="muted">아직 구매 기록이 없습니다.</li>`;
        return;
      }
      ul.innerHTML = items
        .map(
          (a) => `
        <li>
          <span class="dot ${a.source === "discord" ? "discord" : ""}"></span>
          <div>
            <span class="name">${escapeHtml(a.username)}</span> 님이
            <span class="product">${escapeHtml(a.product_name)}</span> 구매
          </div>
          <span class="time">${timeAgo(a.created_at)}</span>
        </li>`
        )
        .join("");
    } catch {
      $("#activityList").innerHTML = `<li class="muted">불러오기 실패</li>`;
    }
  }

  async function loadReviews() {
    const list = $("#reviewsList");
    try {
      const reviews = await api("/api/reviews");
      if (!reviews.length) {
        list.innerHTML = `<div class="empty">첫 후기를 남겨보세요!</div>`;
        return;
      }
      const meId = state.config?.user?.id;
      const isAdm = !!state.config?.isAdmin;
      list.innerHTML = reviews
        .map((r) => {
          const canDel = isAdm || (meId && r.user_id === meId);
          return `
        <div class="review-card">
          ${canDel ? `<div class="review-actions"><button class="btn btn-sm btn-danger" data-del-review="${escapeHtml(r.id)}">삭제</button></div>` : ""}
          <div class="review-stars">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</div>
          <div>${escapeHtml(r.body)}</div>
          <div class="review-meta">${escapeHtml(r.discord_name)} · ${timeAgo(r.created_at)}</div>
        </div>`;
        })
        .join("");
      $$("[data-del-review]", list).forEach((b) =>
        b.addEventListener("click", async () => {
          if (!confirm("이 후기를 삭제할까요?")) return;
          try {
            await api(`/api/reviews/${encodeURIComponent(b.dataset.delReview)}`, { method: "DELETE" });
            toast("후기가 삭제되었습니다.", "success");
            loadReviews();
          } catch (e) {
            toast(e.message, "error");
          }
        })
      );
    } catch (e) {
      list.innerHTML = `<div class="empty">${escapeHtml(e.message)}</div>`;
    }
  }

  $("#btnWriteReview").addEventListener("click", () => {
    if (!state.config?.loggedIn) return toast("로그인이 필요합니다.", "error");
    state.reviewRating = 5;
    updateStars();
    $("#reviewBody").value = "";
    openModal("#modalReview");
  });
  function updateStars() {
    $$("#reviewStars button").forEach((b) =>
      b.classList.toggle("on", Number(b.dataset.r) <= state.reviewRating)
    );
  }
  $$("#reviewStars button").forEach((b) =>
    b.addEventListener("click", () => {
      state.reviewRating = Number(b.dataset.r);
      updateStars();
    })
  );
  $("#btnSubmitReview").addEventListener("click", async () => {
    try {
      await api("/api/reviews", {
        method: "POST",
        body: { rating: state.reviewRating, body: $("#reviewBody").value.trim() },
      });
      closeModals();
      toast("후기가 등록되었습니다.", "success");
      loadReviews();
    } catch (e) {
      toast(e.message, "error");
    }
  });

  async function loadSupport() {
    if (!state.config?.loggedIn) {
      $("#supportMessages").innerHTML = `<div class="muted">로그인 후 이용할 수 있습니다.</div>`;
      return;
    }
    try {
      const { ticket, messages } = await api("/api/support");
      $("#btnCloseTicket").classList.toggle("hidden", !ticket);
      if (!messages?.length) {
        $("#supportMessages").innerHTML = `<div class="muted">문의 내역이 없습니다.</div>`;
        return;
      }
      $("#supportMessages").innerHTML = messages
        .map(
          (m) => `
        <div class="msg ${m.sender_role === "admin" ? "admin" : ""}">
          <div class="meta">${escapeHtml(m.sender_name)} · ${m.sender_role === "admin" ? "관리자" : "나"} · ${timeAgo(m.created_at)}</div>
          <div>${escapeHtml(m.body)}</div>
        </div>`
        )
        .join("");
    } catch (e) {
      $("#supportMessages").innerHTML = `<div class="muted">${escapeHtml(e.message)}</div>`;
    }
  }

  $("#btnSendSupport").addEventListener("click", async () => {
    if (!state.config?.loggedIn) return toast("로그인이 필요합니다.", "error");
    try {
      await api("/api/support", {
        method: "POST",
        body: {
          subject: $("#supportSubject").value.trim() || "일반 문의",
          body: $("#supportBody").value.trim(),
        },
      });
      $("#supportBody").value = "";
      toast("문의가 전송되었습니다.", "success");
      loadSupport();
    } catch (e) {
      toast(e.message, "error");
    }
  });
  $("#btnCloseTicket").addEventListener("click", async () => {
    try {
      await api("/api/support/close", { method: "POST", body: {} });
      toast("문의가 종료되었습니다.");
      loadSupport();
    } catch (e) {
      toast(e.message, "error");
    }
  });

  async function loadNotices() {
    try {
      const notices = await api("/api/notices");
      const list = $("#noticesList");
      const strip = $("#noticeStrip");
      if (notices.length) {
        const latest = notices[0];
        strip.classList.remove("hidden");
        strip.innerHTML = `<strong>공지</strong> <span>${escapeHtml(latest.title)}</span>
          <button class="btn btn-sm btn-ghost" data-section="notices" style="margin-left:auto">전체보기</button>`;
        strip.querySelector("[data-section]")?.addEventListener("click", () => showSection("notices"));
      } else strip.classList.add("hidden");

      if (!notices.length) {
        list.innerHTML = `<div class="empty">등록된 공지가 없습니다. 관리자 패널에서 작성할 수 있습니다.</div>`;
        return;
      }
      list.innerHTML = notices
        .map(
          (n) => `
        <div class="notice-card">
          <h3>${escapeHtml(n.title)}</h3>
          <div style="white-space:pre-wrap">${escapeHtml(n.body)}</div>
          <div class="meta">${escapeHtml(n.author || "")} · ${timeAgo(n.created_at)}</div>
        </div>`
        )
        .join("");
    } catch (e) {
      $("#noticesList").innerHTML = `<div class="empty">${escapeHtml(e.message)}</div>`;
    }
  }

  function updateBonusPreview() {
    const el = $("#bonusPreview");
    if (!el) return;
    const amount = Math.floor(Number($("#topupAmount")?.value || 0));
    const tb = state.config?.topupBonus || { min: 10000, percent: 5, tiers: [] };
    let pct = 0;
    if (amount >= 50000) pct = Math.max(tb.percent || 5, 10);
    else if (amount >= 30000) pct = Math.max(tb.percent || 5, 7);
    else if (amount >= (tb.min || 10000)) pct = tb.percent || 5;
    if (pct > 0) {
      const bonus = Math.floor(amount * pct / 100);
      el.classList.remove("hidden");
      el.innerHTML = `🔥 ${fmt(amount)}원 충전 보너스 <span>+${pct}%</span> → <span>+${fmt(bonus)}원</span> (총 지급 ${fmt(amount+bonus)}원)`;
    } else {
      el.classList.remove("hidden");
      el.innerHTML = `🔥 1만원↑ +5% · 3만원↑ +7% · 5만원↑ +10% <span>보너스 지급!</span>`;
    }
  }
  function openTopup() {
    if (!state.config?.loggedIn) return toast("로그인이 필요합니다.", "error");
    const bank = state.config.bank || {};
    $("#bankInfo").innerHTML = `
      <div>은행: <strong>${escapeHtml(bank.name || "토스뱅크")}</strong></div>
      <div>계좌: <strong id="bankAcc">${escapeHtml(bank.account || "1908-8064-8818")}</strong>
        <button type="button" class="bank-copy" id="copyAcc">복사</button></div>
      <div>예금주: <strong>${escapeHtml(bank.holder || "문성식")}</strong></div>
      <p class="muted" style="margin-top:8px">입금 후 아래 정보를 제출하면 관리자가 확인합니다.</p>
    `;
    $("#copyAcc")?.addEventListener("click", () =>
      copyText(bank.account || "1908-8064-8818")
    );
    if (!$("#topupDepositor").value && state.config.user?.username) {
      $("#topupDepositor").value = state.config.user.username;
    }
    updateBonusPreview();
    openModal("#modalTopup");
  }
  $("#topupAmount")?.addEventListener("input", updateBonusPreview);
  $$(".quick-amounts .chip").forEach((c) => {
    c.addEventListener("click", () => setTimeout(updateBonusPreview, 0));
  });

  async function loadPopular() {
    const grid = $("#popularGrid");
    if (!grid) return;
    try {
      const items = await api("/api/products/popular");
      if (!items.length) { grid.innerHTML = ""; return; }
      grid.innerHTML = items.slice(0, 4).map((p) => `
        <article class="product-card" data-id="${p.id}">
          <div class="product-top">
            <div class="product-icon">${p.icon || "🎁"}</div>
            <span class="product-badge hot">판매 ${p.sold||0}</span>
          </div>
          <div class="product-name">${escapeHtml(p.name)}</div>
          <div class="product-desc">${escapeHtml(p.description || "")}</div>
          <div class="product-footer">
            <div class="product-price">${fmt(p.price)}<span>원</span></div>
            <button class="btn btn-sm btn-accent">구매</button>
          </div>
        </article>`).join("");
      $$(".product-card", grid).forEach((card) =>
        card.addEventListener("click", () => openProduct(card.dataset.id))
      );
    } catch {
      grid.innerHTML = "";
    }
  }

  async function loadVip() {
    const panel = $("#vipPanel");
    const th = state.config?.vipThresholds || {1:10000,2:30000,3:70000};
    const disc = state.config?.vipDiscounts || {1:3,2:6,3:10};
    const prices = state.config?.vipPrices || {1:5000,2:12000,3:25000};
    const allPerks = state.config?.vipPerks || {
      1: ["상품 3% 할인","월 1회 VIP 보너스 지급","이벤트 / 특가 상품 우선 구매","VIP 전용 공지 확인"],
      2: ["상품 6% 할인","월 2회 VIP 보너스 지급","이벤트 / 특가 상품 우선 구매","신규 상품 우선 구매","VIP 2 전용 보너스 상품 지급"],
      3: ["상품 10% 할인","월 3회 VIP 보너스 지급","신규 상품 최우선 구매","VIP 3 전용 보너스 상품 지급","한정 상품 / 이벤트 우선 참여","VIP 전용 역할 및 채널 이용"]
    };
    if ($("#vipNeedText")) $("#vipNeedText").textContent = `VIP1 ${fmt(th[1])} / VIP2 ${fmt(th[2])} / VIP3 ${fmt(th[3])}`;

    const tiers = $("#vipTiers");
    if (tiers) {
      tiers.innerHTML = [1,2,3].map((lv) => `
        <div class="product-card" style="cursor:default">
          <div class="product-top">
            <div class="product-icon">${lv===3?"💎":lv===2?"💠":"👑"}</div>
            <span class="product-badge ${lv===3?"hot":""}">VIP ${lv}</span>
          </div>
          <div class="product-name">VIP ${lv}</div>
          <div class="product-desc">누적 구매 ${fmt(th[lv])}원 이상 · 할인 ${disc[lv]}%</div>
          <ul class="contents-list" style="margin-top:8px">${(allPerks[lv]||[]).map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul>
          <div class="muted" style="font-size:.78rem;margin-top:8px">또는 구매 ${fmt(prices[lv])}원</div>
        </div>`).join("");
    }

    if (!state.config?.loggedIn) {
      panel.innerHTML = `<p class="muted">로그인 후 내 VIP 등급과 월 보너스를 확인할 수 있습니다.</p>
        <p class="muted" style="margin-top:8px">※ 누적 구매 금액 기준으로 등급이 적용됩니다.</p>`;
      if ($("#vipBuyButtons")) $("#vipBuyButtons").innerHTML = `<span class="muted">로그인 후 구매 가능</span>`;
      if ($("#referralInfo")) $("#referralInfo").innerHTML = "로그인 후 확인";
      return;
    }

    try {
      const v = await api("/api/me/vip");
      const nextLabel = v.level >= 3 ? "최고 등급입니다" : `다음 자동등급까지 구매 ${fmt(Math.max(0,(v.nextNeed||0)-v.spendTotal))}원 필요`;
      panel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
          <div>
            <strong style="font-size:1.15rem">${v.level>=1 ? `👑 VIP ${v.level}` : "일반 회원"}</strong>
            <p class="muted" style="margin-top:4px">누적 구매 ${fmt(v.spendTotal)}원${v.discount?` · 할인 ${v.discount}%`:""}${v.purchased?` · 구매등급 VIP${v.purchased}`:""}</p>
          </div>
          ${v.level>=1 ? `<span class="vip-badge">VIP${v.level}</span>` : ""}
        </div>
        <div class="vip-bar"><i style="width:${v.progress}%"></i></div>
        <p class="muted" style="font-size:.82rem">${v.progress}% · ${nextLabel}</p>
        ${v.level>=1 ? `
        <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <button class="btn btn-primary" id="btnClaimVipBonus">월 보너스 받기 (남은 ${v.claimsLeft}회)</button>
          <span class="muted" style="font-size:.8rem">이번 달 ${v.claimsThisMonth||0}/${v.monthlyLimit?.[v.level]||0}회</span>
        </div>` : ""}
        <p class="muted" style="margin-top:10px;font-size:.8rem">${escapeHtml(v.note||"")}</p>
      `;
      $("#btnClaimVipBonus")?.addEventListener("click", async () => {
        try {
          const r = await api("/api/vip/claim-bonus", { method: "POST", body: {} });
          toast(`보너스 +${fmt(r.amount)}원 지급!`, "success");
          loadWallet();
          loadVip();
        } catch (e) { toast(e.message, "error"); }
      });

      const buy = $("#vipBuyButtons");
      if (buy) {
        buy.innerHTML = [1,2,3].map((lv) => {
          const disabled = v.level >= lv;
          return `<button class="btn ${disabled?"btn-ghost":"btn-accent"}" data-buy-vip="${lv}" ${disabled?"disabled":""}>
            VIP${lv} 구매 · ${fmt(v.prices?.[lv]||prices[lv])}원 ${disabled?"(보유중)":""}
          </button>`;
        }).join("");
        $$("[data-buy-vip]", buy).forEach((b) =>
          b.addEventListener("click", async () => {
            const lv = Number(b.dataset.buyVip);
            if (!confirm(`VIP ${lv}을(를) ${fmt(v.prices?.[lv]||prices[lv])}P로 구매할까요?`)) return;
            try {
              const r = await api("/api/vip/purchase", { method: "POST", body: { level: lv } });
              toast(`VIP ${r.level} 적용 완료!`, "success");
              await loadConfig();
              loadWallet();
              loadVip();
            } catch (e) {
              if (e.data?.needTopup) openTopup();
              toast(e.message, "error");
            }
          })
        );
      }
    } catch (e) {
      panel.innerHTML = `<p class="muted">${escapeHtml(e.message)}</p>`;
    }

    try {
      const ref = await api("/api/referral/me");
      const box = $("#referralInfo");
      if (!box) return;
      box.innerHTML = `
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px">
          <strong>내 코드: <code>${escapeHtml(ref.code)}</code></strong>
          <button class="btn btn-sm btn-accent" id="btnCopyRef" type="button">복사</button>
          <span class="muted">초대한 친구 ${ref.invited||0}명</span>
        </div>
        ${ref.referred_by ? `<p class="muted">추천인 등록 완료</p>` : `
        <div style="display:flex;gap:8px;margin-top:8px">
          <input id="refInput" class="input" placeholder="친구 추천코드 입력" style="margin:0" />
          <button class="btn btn-primary" id="btnBindRef" type="button">등록</button>
        </div>`}
      `;
      $("#btnCopyRef")?.addEventListener("click", () => copyText(ref.code));
      $("#btnBindRef")?.addEventListener("click", async () => {
        try {
          const r = await api("/api/referral/bind", { method: "POST", body: { code: $("#refInput").value.trim() } });
          toast(`추천인 등록: ${r.referrer}`, "success");
          loadVip();
        } catch (err) { toast(err.message, "error"); }
      });
    } catch {}
  }

  $("#btnTopup").addEventListener("click", openTopup);
  $("#btnTopupHero").addEventListener("click", openTopup);
  $("#btnTopupMobile")?.addEventListener("click", openTopup);
  $$(".quick-amounts .chip").forEach((c) =>
    c.addEventListener("click", () => {
      $("#topupAmount").value = c.dataset.amount;
    })
  );
  $("#btnSubmitTopup").addEventListener("click", async () => {
    try {
      await api("/api/wallet/topups", {
        method: "POST",
        body: {
          depositor: $("#topupDepositor").value.trim(),
          amount: Number($("#topupAmount").value),
        },
      });
      closeModals();
      toast("충전 요청이 전송되었습니다. 입금 확인 후 포인트가 지급됩니다.", "success");
      loadWallet();
    } catch (e) {
      toast(e.message, "error");
    }
  });

  let authMode = "login";
  function syncAuthModal(){
    $("#authTitle").textContent = authMode === "login" ? "로그인" : "회원가입";
    $("#authDesc").textContent = authMode === "login" ? "CATSMARKET 계정으로 로그인하세요." : "새 CATSMARKET 계정을 만들어주세요.";
    $("#btnAuthSubmit").textContent = authMode === "login" ? "로그인" : "회원가입";
    $("#btnAuthToggle").textContent = authMode === "login" ? "회원가입으로 전환" : "로그인으로 전환";
    $("#authPassword").setAttribute("autocomplete", authMode === "login" ? "current-password" : "new-password");
  }
  $("#btnLogin").addEventListener("click", () => { authMode="login"; syncAuthModal(); openModal("#modalAuth"); });
  $("#btnAuthToggle").addEventListener("click", () => { authMode = authMode === "login" ? "register" : "login"; syncAuthModal(); });
  $("#btnAuthSubmit").addEventListener("click", async () => {
    try {
      const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
      await api(endpoint,{method:"POST",body:{username:$("#authUsername").value.trim(),password:$("#authPassword").value}});
      closeModals(); toast(authMode === "login" ? "로그인되었습니다." : "회원가입이 완료되었습니다.","success"); location.reload();
    } catch(e){ toast(e.message,"error"); }
  });
  $("#btnLogout").addEventListener("click", async () => {
    await api("/auth/logout", { method: "POST", body: {} });
    location.reload();
  });

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  setInterval(async () => {
    if (!state.config?.loggedIn) return;
    try {
      const orders = await api("/api/orders");
      let newOne = false;
      for (const o of orders) {
        if (
          o.status === "completed" &&
          (o.delivered_save_code || o.delivered_verification_code) &&
          !state.knownDelivered.has(o.order_no)
        ) {
          state.knownDelivered.add(o.order_no);
          newOne = true;
        }
      }
      if (newOne) showDeliverAlert();
    } catch {}
  }, 15000);

  (async () => {
    try {
      await loadConfig();
      await Promise.all([loadProducts(), loadActivity(), loadNotices(), loadPopular()]);
      const hash = (location.hash || "").replace("#", "");
      if (["orders", "reviews", "support", "notices", "faq", "shop", "vip"].includes(hash)) {
        showSection(hash);
      }
    } catch (e) {
      toast("초기 로딩 실패: " + e.message, "error");
    }
  })();
})();
