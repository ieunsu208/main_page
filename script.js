const story = document.querySelector(".story");

if (story && "IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  story.classList.add("story--reveal-ready");

  const observer = new IntersectionObserver((entries) => {
    story.classList.toggle("story--visible", entries[0].isIntersecting);
  }, { rootMargin: "0px 0px -10% 0px", threshold: 0 });

  observer.observe(story);

  const photoObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle("story__photo--visible", entry.isIntersecting);
    });
  }, { rootMargin: "0px 0px -10% 0px", threshold: 0 });

  story.querySelectorAll(".story__photo").forEach((photo) => photoObserver.observe(photo));

  // 상단 제목·소개 문단은 문구 자체가 화면에 들어올 때 애니메이션을 시작한다
  const storyIntro = story.querySelector(".story__intro");
  new IntersectionObserver((entries) => {
    storyIntro.classList.toggle("story__intro--visible", entries[0].isIntersecting);
  }, { rootMargin: "0px 0px -10% 0px", threshold: 0 }).observe(storyIntro);

  const storyCanvas = story.querySelector(".story__canvas");
  const storyDetail = story.querySelector(".story__detail");
  const storyItems = [...story.querySelectorAll(".story__detail-item")];
  let storyPinStart = 0;
  let storyPinDuration = 0;
  let storyFrame = 0;

  storyItems.forEach((item) => item.setAttribute("aria-hidden", "true"));
  story.classList.add("story--pin-ready");

  const updateStoryScroll = () => {
    storyFrame = 0;
    const progress = Math.max(0, Math.min(1, (window.scrollY - storyPinStart) / storyPinDuration));
    const revealStart = storyPinStart - window.innerHeight * 0.12;
    const activeIndex = window.scrollY < revealStart
      ? -1
      : Math.min(storyItems.length - 1, Math.floor(progress * storyItems.length));

    storyItems.forEach((item, index) => {
      const active = index === activeIndex;
      const line = item.querySelector(".story__detail-line");
      const paragraph = line.querySelector("p");
      const segmentProgress = Math.max(0, Math.min(1, progress * storyItems.length - index));
      const readingProgress = Math.max(0, Math.min(1, (segmentProgress - 0.18) / 0.64));
      const overflow = window.innerWidth <= 600 ? Math.max(0, paragraph.scrollWidth - line.clientWidth) : 0;

      paragraph.style.setProperty("--story-line-shift", `${-overflow * readingProgress}px`);
    });

    if (activeIndex !== storyActiveIndex) morphStoryItem(storyActiveIndex, activeIndex);
  };

  // 레이아웃 변신: 문구가 바뀔 때 이전 문구는 다음 위치로 옮겨 가며 사라지고,
  // 다음 문구는 이전 위치에서 출발해 제자리로 옮겨 오며 나타난다.
  let storyActiveIndex = -1;
  const morphStoryItem = (fromIndex, toIndex) => {
    storyActiveIndex = toIndex;
    const from = storyItems[fromIndex];
    const to = storyItems[toIndex];
    const offset = (a, b) => ({
      x: b.offsetLeft - a.offsetLeft,
      y: b.offsetTop - a.offsetTop,
    });

    if (from) {
      const move = to ? offset(from, to) : { x: 0, y: 0 };
      from.style.setProperty("--morph-x", `${move.x}px`);
      from.style.setProperty("--morph-y", `${move.y}px`);
      from.classList.remove("story__detail-item--active");
      from.setAttribute("aria-hidden", "true");
    }

    if (to) {
      const move = from ? offset(to, from) : { x: 0, y: 24 };
      to.classList.add("story__detail-item--jump");
      to.style.setProperty("--morph-x", `${move.x}px`);
      to.style.setProperty("--morph-y", `${move.y}px`);
      void to.offsetWidth;
      to.classList.remove("story__detail-item--jump");
      to.classList.add("story__detail-item--active");
      to.setAttribute("aria-hidden", "false");
    }
  };

  const scheduleStoryScroll = () => {
    if (!storyFrame) storyFrame = requestAnimationFrame(updateStoryScroll);
  };

  const refreshStoryPin = () => {
    storyPinDuration = Math.max(1800, window.innerHeight * 1.1 * storyItems.length);
    const detailCenter = storyDetail.offsetTop + storyItems[0].offsetHeight / 2;
    const pinTop = window.innerHeight * 0.43 - detailCenter;
    story.style.setProperty("--story-pin-top", `${pinTop}px`);
    story.style.height = `${storyCanvas.offsetHeight + storyPinDuration}px`;
    storyPinStart = story.getBoundingClientRect().top + window.scrollY - pinTop;
    scheduleStoryScroll();
  };

  window.addEventListener("scroll", scheduleStoryScroll, { passive: true });
  window.addEventListener("resize", refreshStoryPin);
  document.fonts.ready.then(refreshStoryPin);
  refreshStoryPin();
}

const process = document.querySelector(".process");

if (process && "IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  process.classList.add("process--motion-ready");

  const processObserver = new IntersectionObserver((entries) => {
    process.classList.toggle("process--visible", entries[0].isIntersecting);
  }, { rootMargin: "0px 0px -10% 0px", threshold: 0 });
  processObserver.observe(process);

  const textObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle("process__text--visible", entry.isIntersecting);
    });
  }, { rootMargin: "0px 0px -12% 0px", threshold: 0 });
  process.querySelectorAll(".process__text").forEach((item) => textObserver.observe(item));

  const processPhotoFrames = process.querySelectorAll(".process__photo-frame");
  let zoomFrame = 0;

  // 이미지가 화면에 1/3 드러나기 전에는 작은 상태로 가만히 있다가, 1/3이 넘으면 그때부터 스크롤에 맞춰 커진다.
  // 스크롤을 다시 올리면 같은 비율로 다시 작아진다.
  // 이미지는 작은 크기(72%)로 틀 아래쪽에 붙어 있으므로, 틀이 아니라 실제로 보이는 작은 이미지 기준으로 1/3을 잰다.
  const minScale = 0.72;
  const maxScale = 1.12;
  const updateProcessZoom = () => {
    zoomFrame = 0;
    const viewportHeight = window.innerHeight;

    processPhotoFrames.forEach((frame) => {
      const bounds = frame.getBoundingClientRect();
      const smallHeight = bounds.height * minScale;
      const smallTop = bounds.bottom - smallHeight;
      const shownHeight = viewportHeight - smallTop;
      const zoomDistance = viewportHeight * 0.7;
      const progress = Math.max(0, Math.min(1, (shownHeight - smallHeight / 3) / zoomDistance));
      frame.querySelector(".process__photo").style.setProperty("--process-photo-scale", (minScale + progress * (maxScale - minScale)).toFixed(3));
    });
  };

  const scheduleProcessZoom = () => {
    if (!zoomFrame) zoomFrame = requestAnimationFrame(updateProcessZoom);
  };

  window.addEventListener("scroll", scheduleProcessZoom, { passive: true });
  window.addEventListener("resize", scheduleProcessZoom);
  scheduleProcessZoom();
}

const scentSystem = document.querySelector(".scent-system");

if (scentSystem && "IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  scentSystem.classList.add("scent-system--reveal-ready");

  const scentObserver = new IntersectionObserver((entries) => {
    scentSystem.classList.toggle("scent-system--visible", entries[0].isIntersecting);
  }, { rootMargin: "0px 0px -10% 0px", threshold: 0 });
  scentObserver.observe(scentSystem);

  const cardsObserver = new IntersectionObserver((entries) => {
    scentSystem.classList.toggle("scent-system--cards-visible", entries[0].isIntersecting);
  }, { rootMargin: "0px 0px -15% 0px", threshold: 0 });
  cardsObserver.observe(scentSystem.querySelector(".scent-system__cards"));
}

/* ───── 애니메이션: Figma `애니메이션` 섹션 주석 + 요청 반영 ───── */
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const canAnimate = !reduceMotion && "IntersectionObserver" in window;
const clamp01 = (value) => Math.max(0, Math.min(1, value));

if (canAnimate) document.documentElement.classList.add("motion");

// 탑바: 밝은 배경 위에 있으면 글자·아이콘을 어둡게
const siteHeader = document.querySelector(".site-header");
const lightAreas = [...document.querySelectorAll('[data-header-tone="light"]')];
let headerFrame = 0;

const updateHeaderTone = () => {
  headerFrame = 0;
  const line = siteHeader.getBoundingClientRect().top + siteHeader.offsetHeight / 2;
  const onLight = lightAreas.some((area) => {
    const bounds = area.getBoundingClientRect();
    return bounds.top <= line && bounds.bottom >= line;
  });
  siteHeader.classList.toggle("site-header--dark", onLight);
};

if (siteHeader) {
  const scheduleHeaderTone = () => { if (!headerFrame) headerFrame = requestAnimationFrame(updateHeaderTone); };
  window.addEventListener("scroll", scheduleHeaderTone, { passive: true });
  window.addEventListener("resize", scheduleHeaderTone);
  updateHeaderTone();
}

// 1섹션: 접속하면 커튼형 장면 전환 → 제목 글자가 하나씩 나타나고 → 아래 캡션이 페이드 업 (스크롤과 무관)
const hero = document.querySelector(".hero");
const heroChars = [];

if (canAnimate && hero) {
  hero.classList.add("hero--animate");
  const heroTitle = hero.querySelector("h1");
  const splitText = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const fragment = document.createDocumentFragment();
        [...child.textContent].forEach((char) => {
          if (char.trim() === "") {
            fragment.append(char);
            return;
          }
          const span = document.createElement("span");
          span.className = "hero__char";
          span.setAttribute("aria-hidden", "true");
          span.textContent = char;
          span.style.setProperty("--char-delay", `${700 + heroChars.length * 70}ms`);
          heroChars.push(span);
          fragment.append(span);
        });
        child.replaceWith(fragment);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        splitText(child);
      }
    });
  };
  splitText(heroTitle);
  hero.style.setProperty("--caption-delay", `${700 + heroChars.length * 70 + 300}ms`);

  const curtains = ["left", "right"].map((side) => {
    const curtain = document.createElement("div");
    curtain.className = `hero__curtain hero__curtain--${side}`;
    curtain.setAttribute("aria-hidden", "true");
    hero.append(curtain);
    return curtain;
  });

  requestAnimationFrame(() => requestAnimationFrame(() => {
    hero.classList.add("hero--open", "hero--play");
    setTimeout(() => curtains.forEach((curtain) => curtain.remove()), 1700);
  }));
}

// 공통 등장 효과 (IntersectionObserver)
const revealTargets = [
  [".discovery__intro h2", "text"],
  [".discovery__tags", "text", 120],
  [".fragrance-story__rail", "slide-right"],
  [".fragrance-story__card", "slide-right", 750, -250],
  [".lifestyle__heading", "text"],
  [".lifestyle__row--atelier", "slide-left"],
  [".lifestyle__row--gift", "slide-right"],
  [".lifestyle__row--guasha", "slide-left"],
  [".site-footer__poem", "fade"],
  [".site-footer__panel", "fade", 250, 250],
  [".site-footer__wordmark", "fade", 1000],
  [".site-footer__est", "fade", 1200],
  [".site-footer__info", "fade-up"],
];

if (canAnimate) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => entry.target.classList.toggle("is-revealed", entry.isIntersecting));
  }, { rootMargin: "0px 0px -12% 0px", threshold: 0 });

  revealTargets.forEach(([selector, type, delay = 0, step = 0]) => {
    document.querySelectorAll(selector).forEach((element, index) => {
      element.dataset.reveal = type;
      element.style.setProperty("--reveal-delay", `${delay + index * step}ms`);
      revealObserver.observe(element);
    });
  });

  // 8섹션 디스커버리 킷: 섹션이 화면에 보이자마자 텍스트가 나타난다
  const discovery = document.querySelector(".discovery");
  if (discovery) {
    const discoveryTexts = discovery.querySelectorAll(".discovery__intro [data-reveal]");
    discoveryTexts.forEach((element) => revealObserver.unobserve(element));
    new IntersectionObserver((entries) => {
      discoveryTexts.forEach((element) => element.classList.toggle("is-revealed", entries[0].isIntersecting));
    }, { threshold: 0 }).observe(discovery);
  }

  // 5~7섹션: 카드가 화면 중간까지 올라왔을 때 왼쪽 칸은 왼쪽에서, 오른쪽 칸은 오른쪽에서 들어온다
  const halfwayObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      entry.target.querySelectorAll("[data-reveal]").forEach((column) => column.classList.toggle("is-revealed", entry.isIntersecting));
      entry.target.dispatchEvent(new CustomEvent(entry.isIntersecting ? "mapea:shown" : "mapea:hidden"));
    });
  }, { rootMargin: "0px 0px -50% 0px", threshold: 0 });

  document.querySelectorAll(".mapea-feature__canvas").forEach((canvas) => {
    canvas.firstElementChild.dataset.reveal = "slide-left";
    canvas.lastElementChild.dataset.reveal = "slide-right";
    canvas.lastElementChild.style.setProperty("--reveal-delay", "120ms");
    halfwayObserver.observe(canvas);
  });

  // 10섹션: 화면 중간쯤 오면 위 이미지가 차례로 나타나고, 위 이미지가 절반쯤 나타났을 때 아래 제품 이미지가 차례로 나타난다
  const gallery = document.querySelector(".product-gallery");
  if (gallery) {
    const scenes = [...gallery.querySelectorAll(".product-gallery__scene")];
    const products = [...gallery.querySelectorAll(".product-gallery__product")];
    const step = 200;
    const scenesHalfway = ((scenes.length - 1) * step + 1100) / 2;
    scenes.forEach((scene, index) => {
      scene.dataset.reveal = "fade-up";
      scene.style.setProperty("--reveal-delay", `${index * step}ms`);
    });
    products.forEach((product, index) => {
      product.dataset.reveal = "fade-up";
      product.style.setProperty("--reveal-delay", `${scenesHalfway + index * step}ms`);
    });
    const galleryItems = [...scenes, ...products];
    // 화면 중간선에 닿으면 순서대로 나타남
    new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) galleryItems.forEach((element) => element.classList.add("is-revealed"));
    }, { rootMargin: "0px 0px -50% 0px", threshold: 0 }).observe(gallery);
    // 섹션이 화면 아래로 완전히 내려갔을 때만 초기화 → 위에서 다시 내려오면 처음부터 다시 재생
    new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry.isIntersecting && entry.boundingClientRect.top > 0) galleryItems.forEach((element) => element.classList.remove("is-revealed"));
    }, { threshold: 0 }).observe(gallery);
  }
}

// 4섹션: 1·2·3마패가 항상 이 순서로 놓이고, 펼친 카드만 넓어진다(나머지는 좌우 너비가 줄어 접힘).
//        접힌 카드를 누르면 펼쳐지고, 펼친 2·3마패를 다시 누르면 처음 모습(1마패 펼침)으로 돌아간다.
const scentCards = document.querySelector(".scent-system__cards");

if (scentCards) {
  const tiers = [...scentCards.querySelectorAll(".scent-system__tier")];
  const dots = [...document.querySelectorAll(".scent-system__indicators button")];

  const setTier = (tierNumber) => {
    scentCards.dataset.active = String(tierNumber);
    tiers.forEach((tier, index) => {
      const active = index + 1 === tierNumber;
      tier.classList.toggle("is-active", active);
      tier.querySelector(".scent-system__card").inert = !active;
      tier.querySelector(".scent-system__sliver").setAttribute("aria-expanded", String(active));
    });
    dots.forEach((dot, index) => dot.setAttribute("aria-pressed", String(index + 1 === tierNumber)));
  };

  const toggleTier = (tierNumber) => {
    const current = Number(scentCards.dataset.active);
    setTier(current === tierNumber && tierNumber !== 1 ? 1 : tierNumber);
  };

  tiers.forEach((tier, index) => {
    tier.querySelector(".scent-system__sliver").addEventListener("click", () => toggleTier(index + 1));
    if (index > 0) tier.querySelector(".scent-system__card").addEventListener("click", () => toggleTier(index + 1));
  });
  dots.forEach((dot, index) => dot.addEventListener("click", () => toggleTier(index + 1)));
  setTier(1);
}

// 5~7섹션: 제품 이미지 ↔ 원료 이미지(Figma `N마패 시그니처-2`) 슬라이드.
//   양 끝에 복제 이미지를 두어, 마지막에서 넘기면 첫 번째로(첫 번째에서 되돌리면 마지막으로) 끊김 없이 이어진다.
document.querySelectorAll(".mapea-feature__visual").forEach((visual) => {
  const canvas = visual.closest(".mapea-feature__canvas");
  const track = visual.querySelector(".mapea-feature__slides");
  const slides = [...track.querySelectorAll(".mapea-feature__slide")];
  const buttons = [...visual.querySelectorAll(".mapea-feature__indicators button")];
  const total = slides.length;
  const headClone = slides[total - 1].cloneNode(true);
  const tailClone = slides[0].cloneNode(true);
  [headClone, tailClone].forEach((clone) => {
    clone.setAttribute("aria-hidden", "true");
    clone.classList.add("mapea-feature__slide--clone");
    clone.querySelectorAll("img").forEach((img) => { img.alt = ""; img.loading = "eager"; });
  });
  track.prepend(headClone);
  track.append(tailClone);

  let position = 1; // 트랙 안 위치: 0 = 마지막 복제, 1..total = 실제, total+1 = 첫 번째 복제
  let timer = 0;
  let shown = !canAnimate;
  let paused = false;
  let dragId = null;
  let startX = 0;
  let dragX = 0;

  const current = () => ((position - 1) % total + total) % total + 1;

  const render = (animate = true) => {
    if (!animate) track.style.transition = "none";
    visual.style.setProperty("--slide", String(position + 1));
    visual.dataset.slide = String(current());
    if (!animate) {
      track.getBoundingClientRect();
      track.style.transition = "";
    }
    slides.forEach((slide, index) => slide.setAttribute("aria-hidden", String(index + 1 !== current())));
    buttons.forEach((button, index) => button.setAttribute("aria-pressed", String(index + 1 === current())));
  };

  const move = (step) => {
    if (position <= 0 || position >= total + 1) {
      position = position <= 0 ? total : 1;
      render(false);
    }
    position += step;
    render(canAnimate);
    if (!canAnimate) settle();
  };

  const settle = () => {
    if (position === total + 1) { position = 1; render(false); }
    else if (position === 0) { position = total; render(false); }
  };

  track.addEventListener("transitionend", (event) => { if (event.target === track) settle(); });

  const schedule = (delay = 4000) => {
    clearTimeout(timer);
    if (canAnimate && shown && !paused) {
      timer = setTimeout(() => { move(1); schedule(); }, delay);
    }
  };

  buttons.forEach((button, index) => button.addEventListener("click", () => { position = index + 1; render(canAnimate); schedule(); }));

  // 마우스·터치로 끌어서 넘기기: 끄는 동안 이미지가 따라오고, 놓으면 다음/이전 이미지로 (끝에서는 처음으로 이어짐)
  track.querySelectorAll("img").forEach((img) => { img.draggable = false; });
  track.addEventListener("dragstart", (event) => event.preventDefault());
  track.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    settle();
    dragId = event.pointerId;
    startX = event.clientX;
    dragX = 0;
    track.setPointerCapture(dragId);
    visual.classList.add("is-dragging");
  });
  track.addEventListener("pointermove", (event) => {
    if (event.pointerId !== dragId) return;
    dragX = event.clientX - startX;
    visual.style.setProperty("--drag", `${dragX}px`);
  });
  const endDrag = (event) => {
    if (event.pointerId !== dragId) return;
    dragId = null;
    visual.classList.remove("is-dragging");
    visual.style.setProperty("--drag", "0px");
    const threshold = Math.min(120, visual.offsetWidth * .12);
    if (dragX <= -threshold) move(1);
    else if (dragX >= threshold) move(-1);
    schedule();
  };
  track.addEventListener("pointerup", endDrag);
  track.addEventListener("pointercancel", endDrag);

  visual.addEventListener("pointerenter", () => { paused = true; schedule(); });
  visual.addEventListener("pointerleave", () => { paused = false; schedule(); });
  canvas.addEventListener("mapea:shown", () => { shown = true; schedule(1500); });
  canvas.addEventListener("mapea:hidden", () => { shown = false; schedule(); position = 1; render(false); });

  render(false);
});

// 스크롤 연동: 카드 쌓기 · 라이프스타일 풀 스크린 확장
if (canAnimate) {
  const stackSections = [...document.querySelectorAll(".mapea-stack > .mapea-feature")];
  const expandSections = [...document.querySelectorAll(".lifestyle__stage")];
  let scrollFrame = 0;

  const updateScrollMotion = () => {
    scrollFrame = 0;
    const viewport = window.innerHeight;

    stackSections.forEach((section, index) => {
      section.style.setProperty("--stick-top", `${Math.min(0, viewport - section.offsetHeight)}px`);
      const next = stackSections[index + 1];
      const progress = next ? clamp01(1 - next.getBoundingClientRect().top / viewport) : 0;
      section.style.setProperty("--stack-progress", progress.toFixed(3));
    });

    expandSections.forEach((element) => {
      const top = element.getBoundingClientRect().top;
      const progress = clamp01((viewport - top) / (viewport * .85));
      element.style.setProperty("--expand-shrink", (1 - progress).toFixed(3));
    });

  };

  const scheduleScrollMotion = () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScrollMotion);
  };

  window.addEventListener("scroll", scheduleScrollMotion, { passive: true });
  window.addEventListener("resize", scheduleScrollMotion);
  updateScrollMotion();
}
