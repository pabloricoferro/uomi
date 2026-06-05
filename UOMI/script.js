const yearEl = document.getElementById("year");

if (yearEl) {
  yearEl.textContent = String(new Date().getFullYear());
}

(function aboutAnimation() {
  const section = document.getElementById("aboutAnim");
  if (!section) return;

  const sticky = section.querySelector(".about-anim-sticky");
  const hint = section.querySelector(".about-anim-hint");
  if (!sticky) return;

  /* Scroll-linked morph: setInterval + scroll/touch keeps p in sync on Safari
     iOS with Reduce Motion, where rAF/throttled scroll events often break. */
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOutCubic = (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  const $ = (name) => section.querySelector(`[data-part="${name}"]`);
  const elFull = $("body-full");
  const elTop = $("body-top");
  const elBot = $("body-bottom");
  const elHead = $("head");
  const elArmL = $("arm-left");
  const elArmR = $("arm-right");
  const elLegL = $("leg-left");
  const elLegR = $("leg-right");

  const BODY_FULL =
    "M0,25 C5,25 10,34 10,40 C11,50 11,62 11,70 C8,82 4,86 0,86 C-4,86 -8,82 -11,70 C-11,62 -11,50 -10,40 C-10,34 -5,25 0,25 Z";

  /* Same topology: M + 4 cubics (26 floats). Cup morphs into reference U. */
  const BOTTOM_CUP = [
    10, 40, 11, 50, 11, 62, 11, 70, 8, 82, 4, 86, 0, 86, -4, 86, -8, 82, -11,
    70, -11, 62, -11, 50, -10, 40,
  ];
  const BOTTOM_U = [
    -5.5, 7, -6.5, 11, -7.5, 16, -7.5, 21, -7.5, 24, -4, 26.5, 0, 26.5, 4, 26.5,
    7.5, 24, 7.5, 21, 7.5, 16, 6.5, 11, 5.5, 7,
  ];

  /* Torso cap -> M center: one symmetric cubic (parabolic U), split at t=0.5 so
     we still emit two C segments for lerpFlat. Subdivision of
     (-7,55) C (-3,83) (3,83) (7,55) → smooth valley at (0,76), no flat shelf. */
  const TOP_CAP = [-10, 40, -10, 34, -5, 25, 0, 25, 5, 25, 10, 34, 10, 40];
  const TOP_MVAL = [-7, 55, -5, 69, -2.5, 76, 0, 76, 2.5, 76, 5, 69, 7, 55];

  /* Arms: figure -> straight outer legs (diagonal, feet slightly wider than peaks). */
  const ARM_L_0 = [
    [-14, 32],
    [-16, 42],
    [-19, 58],
    [-20, 67],
  ];
  const ARM_L_1 = [
    [-8.8, 84],
    [-8.3, 76],
    [-7.6, 65],
    [-7, 55],
  ];
  const ARM_R_0 = [
    [14, 32],
    [16, 42],
    [19, 58],
    [20, 67],
  ];
  const ARM_R_1 = [
    [8.8, 84],
    [8.3, 76],
    [7.6, 65],
    [7, 55],
  ];

  const LEG_0_L = [
    [-6, 90],
    [-6, 108],
    [-6, 128],
  ];
  const LEG_1 = [
    [0, 88],
    [0, 100],
    [0, 112],
  ];

  /* Match <polyline> limbs: outline ring for head & torso uses this too. */
  const LIMB_STROKE = 3;
  const STROKE_END = 2.35;
  const SLOT_O_CY = 44;
  const SWAP_START = 0.55;
  const SWAP_END = 0.94;

  /* Vertical whitespace between letters at morph end: match U→O gap for O→M and M→I. */
  const U_LETTER_MAX_Y = Math.max(
    ...BOTTOM_U.filter((_, i) => i % 2 === 1)
  );
  const O_RY_END = 10.5;
  const O_LETTER_TOP_Y = SLOT_O_CY - O_RY_END;
  const O_LETTER_BOTTOM_Y = SLOT_O_CY + O_RY_END;
  const LETTER_GAP_Y = O_LETTER_TOP_Y - U_LETTER_MAX_Y;
  const SHIFT_M_FOR_GAP =
    O_LETTER_BOTTOM_Y + LETTER_GAP_Y - TOP_MVAL[1];
  const SHIFT_I_FOR_GAP =
    ARM_L_1[0][1] + SHIFT_M_FOR_GAP + LETTER_GAP_Y - LEG_1[0][1];

  /* Outline silhouette from p≈0.22 until cut; elFull is hidden only once split
     paths are visible (see showSplit), so nothing flashes invisible. */
  const fullKeyframes = [
    { p: 0.0, fillOp: 1, strokeW: 0, opacity: 1 },
    { p: 0.08, fillOp: 1, strokeW: 0, opacity: 1 },
    { p: 0.22, fillOp: 0, strokeW: LIMB_STROKE, opacity: 1 },
    { p: 1.0, fillOp: 0, strokeW: LIMB_STROKE, opacity: 1 },
  ];

  function bracket(kf, p) {
    if (p <= kf[0].p) return [kf[0], kf[0], 0];
    const last = kf[kf.length - 1];
    if (p >= last.p) return [last, last, 1];
    for (let i = 0; i < kf.length - 1; i++) {
      if (p >= kf[i].p && p <= kf[i + 1].p) {
        const t = (p - kf[i].p) / (kf[i + 1].p - kf[i].p);
        return [kf[i], kf[i + 1], t];
      }
    }
    return [kf[0], kf[0], 0];
  }

  function lerpFlat(a, b, t) {
    return a.map((v, i) => lerp(v, b[i], t));
  }

  function dFromCubics(flat) {
    let d = `M${flat[0].toFixed(2)},${flat[1].toFixed(2)}`;
    for (let i = 2; i < flat.length; i += 6) {
      d += ` C${flat[i].toFixed(2)},${flat[i + 1].toFixed(2)} ${flat[i + 2].toFixed(2)},${flat[i + 3].toFixed(2)} ${flat[i + 4].toFixed(2)},${flat[i + 5].toFixed(2)}`;
    }
    return d;
  }

  function lerpPts(a, b, t) {
    return a.map((p, i) => [lerp(p[0], b[i][0], t), lerp(p[1], b[i][1], t)]);
  }

  function ptsToAttr(pts) {
    return pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  }

  const debugP = parseFloat(
    new URLSearchParams(window.location.search).get("p")
  );
  const hasDebugP = !isNaN(debugP);

  function update() {
    const rect = section.getBoundingClientRect();
    let range = section.offsetHeight - sticky.offsetHeight;
    if (!Number.isFinite(range) || range < 1) {
      const sh =
        sticky.offsetHeight || sticky.getBoundingClientRect().height || 0;
      const bh =
        section.offsetHeight || section.getBoundingClientRect().height || 0;
      range = Math.max(1, bh - sh);
    }
    const scrolled = -rect.top;
    const p = hasDebugP ? clamp(debugP, 0, 1) : clamp(scrolled / range, 0, 1);

    /* Phases before / after cut (used by body-full hide vs split show) */
    const showSplit = p >= 0.36;

    /* body-full */
    if (elFull) {
      elFull.setAttribute("d", BODY_FULL);
      let fillOp, strokeW, opacity;
      if (showSplit) {
        fillOp = 0;
        strokeW = 0;
        opacity = 0;
      } else {
        const [a, b, t] = bracket(fullKeyframes, p);
        const e = easeInOutCubic(t);
        fillOp = lerp(a.fillOp, b.fillOp, e);
        strokeW = lerp(a.strokeW, b.strokeW, e);
        opacity = lerp(a.opacity, b.opacity, e);
      }
      elFull.setAttribute("fill-opacity", fillOp.toFixed(3));
      elFull.setAttribute("stroke-width", strokeW.toFixed(2));
      elFull.setAttribute("opacity", opacity.toFixed(3));
    }
    const morphT = easeInOutCubic(clamp((p - 0.55) / (0.94 - 0.55), 0, 1));

    const swapPhase = clamp((p - SWAP_START) / (SWAP_END - SWAP_START), 0, 1);
    const arcX = Math.sin(swapPhase * Math.PI) * 22;

    /* head: deflate then blend into vertical oval O */
    if (elHead) {
      let cy,
        rx,
        ry,
        fillOp,
        strokeW,
        cx = 0;
      if (p < 0.22) {
        /* Exact same fill/stroke ramp as body-full (fullKeyframes); geometry unchanged here. */
        const [a, b, t] = bracket(fullKeyframes, p);
        const e = easeInOutCubic(t);
        cy = 10;
        rx = 5;
        ry = 10;
        fillOp = lerp(a.fillOp, b.fillOp, e);
        strokeW = lerp(a.strokeW, b.strokeW, e);
      } else if (p < 0.55) {
        cy = 10;
        rx = 5;
        ry = 10;
        fillOp = 0;
        strokeW = LIMB_STROKE;
      } else {
        cy = lerp(10, SLOT_O_CY, morphT);
        rx = lerp(5, 5.5, morphT);
        ry = lerp(10, 10.5, morphT);
        fillOp = 0;
        strokeW = lerp(LIMB_STROKE, STROKE_END, morphT);
        cx = arcX;
      }
      elHead.setAttribute("cx", cx.toFixed(2));
      elHead.setAttribute("cy", cy.toFixed(2));
      elHead.setAttribute("rx", rx.toFixed(2));
      elHead.setAttribute("ry", ry.toFixed(2));
      elHead.setAttribute("fill-opacity", fillOp.toFixed(3));
      elHead.setAttribute("stroke-width", strokeW.toFixed(2));
    }

    if (elBot) {
      if (!showSplit) {
        elBot.setAttribute("opacity", "0");
        elBot.setAttribute("transform", "");
      } else {
        elBot.setAttribute("opacity", "1");
        const flat = lerpFlat(BOTTOM_CUP, BOTTOM_U, morphT);
        elBot.setAttribute("d", dFromCubics(flat));
        elBot.setAttribute("fill-opacity", "0");
        const sw = lerp(LIMB_STROKE, STROKE_END, morphT);
        elBot.setAttribute("stroke-width", sw.toFixed(2));
        elBot.setAttribute("transform", `translate(${(-arcX).toFixed(2)} 0)`);
      }
    }

    if (elTop) {
      if (!showSplit) {
        elTop.setAttribute("opacity", "0");
        elTop.setAttribute("transform", "");
      } else {
        elTop.setAttribute("opacity", "1");
        const flat = lerpFlat(TOP_CAP, TOP_MVAL, morphT);
        elTop.setAttribute("d", dFromCubics(flat));
        elTop.setAttribute("fill-opacity", "0");
        const sw = lerp(LIMB_STROKE, STROKE_END, morphT);
        elTop.setAttribute("stroke-width", sw.toFixed(2));
        const mGap = SHIFT_M_FOR_GAP * morphT;
        elTop.setAttribute("transform", `translate(0 ${mGap.toFixed(2)})`);
      }
    }

    if (elArmL && elArmR) {
      const aL = lerpPts(ARM_L_0, ARM_L_1, morphT);
      const aR = lerpPts(ARM_R_0, ARM_R_1, morphT);
      const swA = lerp(LIMB_STROKE, STROKE_END, morphT);
      const mGap = SHIFT_M_FOR_GAP * morphT;
      const armTf = `translate(0 ${mGap.toFixed(2)})`;
      elArmL.setAttribute("points", ptsToAttr(aL));
      elArmR.setAttribute("points", ptsToAttr(aR));
      elArmL.setAttribute("stroke-width", swA.toFixed(2));
      elArmR.setAttribute("stroke-width", swA.toFixed(2));
      elArmL.setAttribute("transform", armTf);
      elArmR.setAttribute("transform", armTf);
      elArmL.setAttribute("opacity", "1");
      elArmR.setAttribute("opacity", "1");
    }

    if (elLegL && elLegR) {
      const legPts = lerpPts(LEG_0_L, LEG_1, morphT);
      const legR0 = [
        [6, 90],
        [6, 108],
        [6, 128],
      ];
      const legPtsR = lerpPts(legR0, LEG_1, morphT);
      const swL = lerp(LIMB_STROKE, STROKE_END, morphT);
      const iGap = SHIFT_I_FOR_GAP * morphT;
      const legTf = `translate(0 ${iGap.toFixed(2)})`;
      elLegL.setAttribute("points", ptsToAttr(legPts));
      elLegR.setAttribute("points", ptsToAttr(legPtsR));
      elLegL.setAttribute("stroke-width", swL.toFixed(2));
      elLegR.setAttribute("stroke-width", swL.toFixed(2));
      elLegL.setAttribute("transform", legTf);
      elLegR.setAttribute("transform", legTf);
      /* Single “I” stroke: fade the duplicate leg out as the two merge. */
      elLegL.setAttribute("opacity", "1");
      elLegR.setAttribute("opacity", (1 - morphT).toFixed(3));
    }

    if (hint) {
      hint.style.setProperty("--hint-op", p > 0.04 ? "0" : "1");
    }
  }

  let tickId = null;

  function armAboutTick() {
    if (tickId !== null) return;
    tickId = window.setInterval(() => {
      if (document.hidden) return;
      update();
    }, 36);
  }

  function disarmAboutTick() {
    if (tickId !== null) {
      clearInterval(tickId);
      tickId = null;
    }
  }

  function bounceUpdate() {
    if (!document.hidden) update();
  }

  window.addEventListener("scroll", bounceUpdate, { passive: true, capture: true });
  document.documentElement.addEventListener("scroll", bounceUpdate, {
    passive: true,
    capture: true,
  });
  window.addEventListener("touchmove", bounceUpdate, { passive: true, capture: true });
  window.addEventListener("touchend", bounceUpdate, { passive: true, capture: true });

  if (window.visualViewport) {
    window.visualViewport.addEventListener("scroll", bounceUpdate, { passive: true });
    window.visualViewport.addEventListener(
      "resize",
      () => {
        bounceUpdate();
      },
      { passive: true }
    );
  }
  if ("onscrollend" in window) {
    window.addEventListener("scrollend", bounceUpdate, { passive: true });
  }
  window.addEventListener("resize", bounceUpdate);

  window.addEventListener("pageshow", () => {
    if (!document.hidden) {
      armAboutTick();
      bounceUpdate();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      disarmAboutTick();
    } else {
      armAboutTick();
      bounceUpdate();
    }
  });

  if (typeof IntersectionObserver !== "undefined") {
    const io = new IntersectionObserver(
      () => {
        bounceUpdate();
      },
      { threshold: [0, 0.01, 0.05, 1], rootMargin: "120px 0px 120px 0px" }
    );
    io.observe(section);
  }

  /* Safari iOS + Reduce Motion often suppresses rAF; interval keeps scroll-driven morph in sync. */
  armAboutTick();
  bounceUpdate();
  window.requestAnimationFrame(() => {
    bounceUpdate();
  });
  window.setTimeout(bounceUpdate, 120);
})();

/* Contact: saludo — brazo der. 10:20:5, 15 fotogramas; brazo superior ~45°, antebrazo 90°/110°/70°. */
(function contactHeroWave() {
  if (!document.body.classList.contains("contact-page")) return;

  const arm = document.getElementById("contactWaveRightArm");
  if (!arm) return;

  if (
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  const F1 = "14,32 16,42 19,62 20,67";
  const F2 = "14,32 24,32 44,32 49,32";
  const F3 = "14,32 24,32 24,12 24,7";
  /* Arco del saludo: 40° entre 70° y 110° (desde horizontal, CCW en coords matemáticas;
     en SVG el antebrazo va codo→muñeca con L2=20, L3=5). 110° = más hacia la cabeza. */
  const F4 = "14,32 24,32 17.16,13.21 15.45,8.51";
  const F5 = "14,32 24,32 30.84,13.21 32.55,8.51";

  const forwardThenReturn = [
    F2,
    F3,
    F4,
    F5,
    F4,
    F5,
    F4,
    F5,
    F3,
    F2,
    F1,
  ];

  const DELAY_MS = 2000;
  const STEP_MS = 260;

  let seqTimers = [];

  function clearSeq() {
    seqTimers.forEach((id) => clearTimeout(id));
    seqTimers = [];
  }

  function runWaveSequence() {
    clearSeq();
    arm.setAttribute("points", F1);
    forwardThenReturn.forEach((pts, i) => {
      seqTimers.push(
        window.setTimeout(() => {
          arm.setAttribute("points", pts);
        }, DELAY_MS + i * STEP_MS)
      );
    });
  }

  runWaveSequence();

  window.addEventListener(
    "pageshow",
    (ev) => {
      if (ev.persisted) {
        runWaveSequence();
      }
    },
    { passive: true }
  );
})();

/* Home: figuras de fondo animadas (leg-sway, egyptian-dance, …) */
(function homeBackgroundAnims() {
  if (!document.body.classList.contains("home-page")) return;

  const reduced =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const loops = [];
  const restarters = [];

  const HIP_Y = 90;
  const FOOT_Y = 130;
  const LEG_L1 = 15;
  const HIP_R_X = 6;
  const HIP_L_X = -6;
  const FOOT_R_X = 6;
  const FOOT_L_X = -6;
  const BODY_UP = 0;
  const BODY_DOWN = 4;

  function kneePt(hipX, hipY, kneeX) {
    const dx = kneeX - hipX;
    const dy = Math.sqrt(Math.max(0, LEG_L1 * LEG_L1 - dx * dx));
    return [
      Math.round(kneeX * 100) / 100,
      Math.round((hipY + dy) * 100) / 100,
    ];
  }

  function legPts(hipX, footX, kneeX, bodyY) {
    const hipY = HIP_Y + bodyY;
    const k = kneePt(hipX, hipY, kneeX);
    return `${hipX},${hipY} ${k[0]},${k[1]} ${footX},${FOOT_Y}`;
  }

  function legSwayFrame(kneeRX, kneeLX, bodyY) {
    return {
      r: legPts(HIP_R_X, FOOT_R_X, kneeRX, bodyY),
      l: legPts(HIP_L_X, FOOT_L_X, kneeLX, bodyY),
      bodyY,
    };
  }

  const LEG_SWAY_SEQUENCE = [
    legSwayFrame(HIP_R_X, HIP_L_X, BODY_UP),
    legSwayFrame(0, -12, BODY_DOWN),
    legSwayFrame(HIP_R_X, HIP_L_X, BODY_UP),
    legSwayFrame(12, 0, BODY_DOWN),
    legSwayFrame(HIP_R_X, HIP_L_X, BODY_UP),
    legSwayFrame(0, -12, BODY_DOWN),
    legSwayFrame(HIP_R_X, HIP_L_X, BODY_UP),
    legSwayFrame(12, 0, BODY_DOWN),
    legSwayFrame(HIP_R_X, HIP_L_X, BODY_UP),
  ];

  const LEG_SWAY_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -2 100 140" preserveAspectRatio="xMidYMid meet" aria-hidden="true">'
    + '<g class="fig-upper">'
    + '<ellipse cx="0" cy="10" rx="5" ry="10" fill="currentColor"/>'
    + '<path fill="currentColor" d="M0 25 C6 25, 10 35, 11 50 C13 68, 14 85, 0 85 C-14 85, -13 68, -11 50 C-10 35, -6 25, 0 25 Z"/>'
    + '<g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">'
    + '<polyline points="14,32 16,42 19,62 20,67"/>'
    + '<polyline points="-14,32 -16,42 -19,62 -20,67"/>'
    + "</g></g>"
    + '<g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">'
    + '<polyline class="fig-leg-r" points="6,90 6,105 6,130"/>'
    + '<polyline class="fig-leg-l" points="-6,90 -6,105 -6,130"/>'
    + "</g></svg>";

  const LEG_SWAY_STEP_MS = 220;

  function applyLegSwayFrame(root, frame) {
    root.querySelector(".fig-leg-r").setAttribute("points", frame.r);
    root.querySelector(".fig-leg-l").setAttribute("points", frame.l);
    const upper = root.querySelector(".fig-upper");
    upper.setAttribute(
      "transform",
      frame.bodyY ? `translate(0 ${frame.bodyY})` : ""
    );
  }

  function startLegSwayLoop(root, startDelay) {
    let idx = 0;
    let timers = [];

    function clearTimers() {
      timers.forEach((id) => clearTimeout(id));
      timers = [];
    }

    function tick() {
      applyLegSwayFrame(root, LEG_SWAY_SEQUENCE[idx]);
      idx = (idx + 1) % LEG_SWAY_SEQUENCE.length;
      timers.push(window.setTimeout(tick, LEG_SWAY_STEP_MS));
    }

    timers.push(window.setTimeout(tick, startDelay));

    const stop = () => clearTimers();
    loops.push(stop);
    return stop;
  }

  function mountLegSway(slot, index) {
    slot.innerHTML = LEG_SWAY_SVG;
    const svg = slot.querySelector("svg");
    applyLegSwayFrame(svg, LEG_SWAY_SEQUENCE[0]);
    if (!reduced) {
      startLegSwayLoop(svg, 800 + index * 400);
    }
    restarters.push(function () {
      applyLegSwayFrame(svg, LEG_SWAY_SEQUENCE[0]);
      if (!reduced) startLegSwayLoop(svg, 800 + index * 400);
    });
  }

  /* Anim. 2: baile egipcio — brazos 10:20:5, piernas 15:25, codos/muñecas/rodillas */
  const SHOULDER_R = [14, 32];
  const SHOULDER_L = [-14, 32];
  const ARM_LEN = [10, 20, 5];
  const LEG_UPPER = 15;
  const EGYPT_BODY_DOWN = 3;
  const EGYPT_STEP_MS = 340;

  function ptFrom(p, len, deg) {
    const r = (deg * Math.PI) / 180;
    return [
      Math.round((p[0] + len * Math.cos(r)) * 100) / 100,
      Math.round((p[1] - len * Math.sin(r)) * 100) / 100,
    ];
  }

  function chainPts(origin, lengths, angles) {
    const pts = [origin];
    let p = origin;
    for (let i = 0; i < lengths.length; i += 1) {
      p = ptFrom(p, lengths[i], angles[i]);
      pts.push(p);
    }
    return pts.map((pt) => `${pt[0]},${pt[1]}`).join(" ");
  }

  function egyptArm(side, a1, a2, a3) {
    const o = side === "r" ? SHOULDER_R : SHOULDER_L;
    return chainPts(o, ARM_LEN, [a1, a2, a3]);
  }

  function egyptLeg(side, u1, u2, bodyY) {
    const hipX = side === "r" ? HIP_R_X : HIP_L_X;
    const hipY = HIP_Y + bodyY;
    return chainPts([hipX, hipY], [LEG_UPPER, 25], [u1, u2]);
  }

  function egyptLegPlanted(side, kneeX, bodyY) {
    const hipX = side === "r" ? HIP_R_X : HIP_L_X;
    const footX = side === "r" ? FOOT_R_X : FOOT_L_X;
    const hipY = HIP_Y + bodyY;
    const dx = kneeX - hipX;
    const dy = Math.sqrt(Math.max(0, LEG_UPPER * LEG_UPPER - dx * dx));
    const knee = [kneeX, Math.round((hipY + dy) * 100) / 100];
    return `${hipX},${hipY} ${knee[0]},${knee[1]} ${footX},${FOOT_Y}`;
  }

  const EGYPT_LEGS = {
    straight(bodyY) {
      return { r: egyptLeg("r", -90, -90, bodyY), l: egyptLeg("l", -90, -90, bodyY) };
    },
    plieL(bodyY) {
      return {
        r: egyptLegPlanted("r", 0, bodyY),
        l: egyptLegPlanted("l", -12, bodyY),
      };
    },
  };

  function egyptPose(bodyY, legsFn, aR, aL) {
    const legs = legsFn(bodyY);
    return {
      bodyY,
      armR: egyptArm("r", aR[0], aR[1], aR[2]),
      armL: egyptArm("l", aL[0], aL[1], aL[2]),
      legR: legs.r,
      legL: legs.l,
    };
  }

  const EGYPTIAN_SEQUENCE = [
    egyptPose(BODY_UP, EGYPT_LEGS.straight, [281, 281, 281], [259, 259, 259]),
    egyptPose(BODY_UP, EGYPT_LEGS.straight, [0, 0, 0], [180, 180, 180]),
    egyptPose(BODY_UP, EGYPT_LEGS.straight, [0, 90, 90], [180, -90, -90]),
    egyptPose(BODY_UP, EGYPT_LEGS.straight, [0, 90, 0], [180, -90, 180]),
    egyptPose(BODY_UP, EGYPT_LEGS.straight, [0, 90, 180], [180, -90, 0]),
    egyptPose(EGYPT_BODY_DOWN, EGYPT_LEGS.plieL, [0, 90, 90], [180, 90, 90]),
    egyptPose(EGYPT_BODY_DOWN, EGYPT_LEGS.plieL, [0, -90, -90], [180, -90, -90]),
    egyptPose(BODY_UP, EGYPT_LEGS.straight, [0, -90, -90], [180, 90, 90]),
    egyptPose(BODY_UP, EGYPT_LEGS.straight, [281, 281, 281], [259, 259, 259]),
  ];

  const EGYPTIAN_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-55 -14 110 155" preserveAspectRatio="xMidYMid meet" aria-hidden="true">'
    + '<g class="fig-root">'
    + '<ellipse cx="0" cy="10" rx="5" ry="10" fill="currentColor"/>'
    + '<path fill="currentColor" d="M0 25 C6 25, 10 35, 11 50 C13 68, 14 85, 0 85 C-14 85, -13 68, -11 50 C-10 35, -6 25, 0 25 Z"/>'
    + '<g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">'
    + '<polyline class="fig-arm-l" points="-14,32 -16,42 -19,62 -20,67"/>'
    + '<polyline class="fig-arm-r" points="14,32 16,42 19,62 20,67"/>'
    + '<polyline class="fig-leg-r" points="6,90 6,105 6,130"/>'
    + '<polyline class="fig-leg-l" points="-6,90 -6,105 -6,130"/>'
    + "</g></g></svg>";

  function applyEgyptianFrame(root, frame) {
    root.querySelector(".fig-arm-l").setAttribute("points", frame.armL);
    root.querySelector(".fig-arm-r").setAttribute("points", frame.armR);
    root.querySelector(".fig-leg-r").setAttribute("points", frame.legR);
    root.querySelector(".fig-leg-l").setAttribute("points", frame.legL);
    root.querySelector(".fig-root").setAttribute(
      "transform",
      frame.bodyY ? `translate(0 ${frame.bodyY})` : ""
    );
  }

  function startEgyptianLoop(root, startDelay) {
    let idx = 0;
    let timers = [];

    function clearTimers() {
      timers.forEach((id) => clearTimeout(id));
      timers = [];
    }

    function tick() {
      applyEgyptianFrame(root, EGYPTIAN_SEQUENCE[idx]);
      idx = (idx + 1) % EGYPTIAN_SEQUENCE.length;
      timers.push(window.setTimeout(tick, EGYPT_STEP_MS));
    }

    timers.push(window.setTimeout(tick, startDelay));
    const stop = () => clearTimers();
    loops.push(stop);
    return stop;
  }

  function mountEgyptian(slot, index) {
    slot.innerHTML = EGYPTIAN_SVG;
    const svg = slot.querySelector("svg");
    applyEgyptianFrame(svg, EGYPTIAN_SEQUENCE[0]);
    if (!reduced) {
      startEgyptianLoop(svg, 1200 + index * 400);
    }
    restarters.push(function () {
      applyEgyptianFrame(svg, EGYPTIAN_SEQUENCE[0]);
      if (!reduced) startEgyptianLoop(svg, 1200 + index * 400);
    });
  }

  /* Anim. 3: ballet — misma secuencia que home-anim-03-preview.html */
  const BALLET_LEG = [15, 25];
  const BALLET_STEP_MS = 300;

  function balletArm(side, a1, a2, a3) {
    const o = side === "r" ? SHOULDER_R : SHOULDER_L;
    return chainPts(o, ARM_LEN, [a1, a2, a3]);
  }

  function balletLegAng(side, u1, u2) {
    const hipX = side === "r" ? HIP_R_X : HIP_L_X;
    return chainPts([hipX, HIP_Y], BALLET_LEG, [u1, u2]);
  }

  function balletLegPlie(side, kneeX) {
    const hipX = side === "r" ? HIP_R_X : HIP_L_X;
    const footX = side === "r" ? FOOT_R_X : FOOT_L_X;
    const dx = kneeX - hipX;
    const dy = Math.sqrt(Math.max(0, BALLET_LEG[0] * BALLET_LEG[0] - dx * dx));
    const knee = [kneeX, Math.round((HIP_Y + dy) * 100) / 100];
    return `${hipX},${HIP_Y} ${knee[0]},${knee[1]} ${footX},${FOOT_Y}`;
  }

  const BALLET_ARMS_T = {
    r: balletArm("r", 0, 0, 0),
    l: balletArm("l", 180, 180, 180),
  };
  const BALLET_ARMS_UP_50 = {
    r: balletArm("r", 50, 50, 50),
    l: balletArm("l", 130, 130, 130),
  };
  const BALLET_ARMS_DOWN_45 = {
    r: balletArm("r", 315, 315, 315),
    l: balletArm("l", 225, 225, 225),
  };
  const BALLET_ARMS_DOWN_MORE = {
    r: balletArm("r", 285, 285, 285),
    l: balletArm("l", 255, 255, 255),
  };
  const BALLET_ARMS_HIP = {
    r: "14,32 17,41 7,58 5,62",
    l: "-14,32 -17,41 -7,58 -5,62",
  };
  const BALLET_LEG_VERT = { r: [-90, -90], l: [-90, -90] };

  function balletPose(bodyY, armR, armL, legR, legL) {
    const lr =
      typeof legR[0] === "number"
        ? balletLegAng("r", legR[0], legR[1])
        : legR;
    const ll =
      typeof legL[0] === "number"
        ? balletLegAng("l", legL[0], legL[1])
        : legL;
    return { bodyY, armR, armL, legR: lr, legL: ll };
  }

  const BALLET_SEQUENCE = [
    balletPose(0, balletArm("r", 281, 281, 281), balletArm("l", 259, 259, 259), BALLET_LEG_VERT.r, BALLET_LEG_VERT.l),
    balletPose(0, balletArm("r", 320, 320, 320), balletArm("l", 220, 220, 220), BALLET_LEG_VERT.r, BALLET_LEG_VERT.l),
    balletPose(0, BALLET_ARMS_T.r, BALLET_ARMS_T.l, BALLET_LEG_VERT.r, BALLET_LEG_VERT.l),
    balletPose(0, BALLET_ARMS_T.r, BALLET_ARMS_T.l, BALLET_LEG_VERT.r, [-121, -121]),
    balletPose(0, BALLET_ARMS_T.r, BALLET_ARMS_T.l, BALLET_LEG_VERT.r, [180, -90]),
    balletPose(0, BALLET_ARMS_T.r, BALLET_ARMS_T.l, BALLET_LEG_VERT.r, [180, 180]),
    balletPose(0, BALLET_ARMS_T.r, BALLET_ARMS_T.l, BALLET_LEG_VERT.r, [120, 140]),
    balletPose(0, BALLET_ARMS_DOWN_45.r, BALLET_ARMS_DOWN_45.l, BALLET_LEG_VERT.r, [125, 200]),
    balletPose(0, BALLET_ARMS_DOWN_MORE.r, BALLET_ARMS_DOWN_MORE.l, BALLET_LEG_VERT.r, [128, 245]),
    balletPose(0, BALLET_ARMS_HIP.r, BALLET_ARMS_HIP.l, BALLET_LEG_VERT.r, [-90, -90]),
    balletPose(4, BALLET_ARMS_HIP.r, BALLET_ARMS_HIP.l, balletLegPlie("r", 10), balletLegPlie("l", -10)),
    balletPose(4, BALLET_ARMS_HIP.r, BALLET_ARMS_HIP.l, balletLegPlie("r", 14), balletLegPlie("l", -14)),
    balletPose(-5, BALLET_ARMS_T.r, BALLET_ARMS_T.l, BALLET_LEG_VERT.r, BALLET_LEG_VERT.l),
    balletPose(-13, BALLET_ARMS_UP_50.r, BALLET_ARMS_UP_50.l, BALLET_LEG_VERT.r, BALLET_LEG_VERT.l),
    balletPose(-5, BALLET_ARMS_T.r, BALLET_ARMS_T.l, BALLET_LEG_VERT.r, BALLET_LEG_VERT.l),
    balletPose(4, BALLET_ARMS_HIP.r, BALLET_ARMS_HIP.l, balletLegPlie("r", 14), balletLegPlie("l", -14)),
  ];

  const BALLET_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-58 -12 118 152" preserveAspectRatio="xMidYMid meet" aria-hidden="true">'
    + '<g class="fig-root">'
    + '<ellipse cx="0" cy="10" rx="5" ry="10" fill="currentColor"/>'
    + '<path fill="currentColor" d="M0 25 C6 25, 10 35, 11 50 C13 68, 14 85, 0 85 C-14 85, -13 68, -11 50 C-10 35, -6 25, 0 25 Z"/>'
    + '<g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">'
    + '<polyline class="fig-arm-l" points="-14,32 -16,42 -19,62 -20,67"/>'
    + '<polyline class="fig-arm-r" points="14,32 16,42 19,62 20,67"/>'
    + '<polyline class="fig-leg-r" points="6,90 6,105 6,130"/>'
    + '<polyline class="fig-leg-l" points="-6,90 -6,105 -6,130"/>'
    + "</g></g></svg>";

  function applyBalletFrame(root, frame) {
    root.querySelector(".fig-arm-l").setAttribute("points", frame.armL);
    root.querySelector(".fig-arm-r").setAttribute("points", frame.armR);
    root.querySelector(".fig-leg-r").setAttribute("points", frame.legR);
    root.querySelector(".fig-leg-l").setAttribute("points", frame.legL);
    root.querySelector(".fig-root").setAttribute(
      "transform",
      frame.bodyY !== 0 ? `translate(0 ${frame.bodyY})` : ""
    );
  }

  function startBalletLoop(root, startDelay) {
    let idx = 0;
    let timers = [];

    function clearTimers() {
      timers.forEach((id) => clearTimeout(id));
      timers = [];
    }

    function tick() {
      applyBalletFrame(root, BALLET_SEQUENCE[idx]);
      idx = (idx + 1) % BALLET_SEQUENCE.length;
      timers.push(window.setTimeout(tick, BALLET_STEP_MS));
    }

    timers.push(window.setTimeout(tick, startDelay));
    const stop = () => clearTimers();
    loops.push(stop);
    return stop;
  }

  function mountBallet(slot, index) {
    slot.innerHTML = BALLET_SVG;
    const svg = slot.querySelector("svg");
    applyBalletFrame(svg, BALLET_SEQUENCE[0]);
    if (!reduced) {
      startBalletLoop(svg, 1600 + index * 400);
    }
    restarters.push(function () {
      applyBalletFrame(svg, BALLET_SEQUENCE[0]);
      if (!reduced) startBalletLoop(svg, 1600 + index * 400);
    });
  }

  /* Anim. 4: brazos + plié + pierna R en L — home-anim-04-preview.html */
  const FIG4_STEP_MS = 320;
  const FIG4_ARMS_DOWN = {
    r: balletArm("r", 281, 281, 281),
    l: balletArm("l", 259, 259, 259),
  };
  const FIG4_ARMS_R_UP_L_DOWN = {
    r: balletArm("r", 55, 55, 55),
    l: balletArm("l", 235, 235, 235),
  };
  const FIG4_ARMS_R_UP = {
    r: balletArm("r", 50, 50, 50),
    l: balletArm("l", 259, 259, 259),
  };
  const FIG4_ARMS_HIP_L = {
    r: balletArm("r", 50, 50, 50),
    l: "-14,32 -17,41 -7,58 -5,62",
  };
  const FIG4_ARMS_L_OUT = balletArm("l", 215, 205, 195);
  const FIG4_ARMS_POSE4 = {
    r: balletArm("r", 50, 50, 50),
    l: balletArm("l", 230, 230, 230),
  };
  const FIG4_LEG_VERT = { r: [-90, -90], l: [-90, -90] };
  const FIG4_LEG_R_BENT = [215, 255];
  const FIG4_LEG_R_LIFT = [180, -90];

  const FIG4_SEQUENCE = [
    balletPose(0, FIG4_ARMS_DOWN.r, FIG4_ARMS_DOWN.l, FIG4_LEG_VERT.r, FIG4_LEG_VERT.l),
    balletPose(0, balletArm("r", 320, 320, 320), FIG4_ARMS_DOWN.l, FIG4_LEG_VERT.r, FIG4_LEG_VERT.l),
    balletPose(0, FIG4_ARMS_R_UP_L_DOWN.r, FIG4_ARMS_R_UP_L_DOWN.l, FIG4_LEG_R_BENT, FIG4_LEG_VERT.l),
    balletPose(0, FIG4_ARMS_R_UP.r, FIG4_ARMS_L_OUT, FIG4_LEG_R_BENT, FIG4_LEG_VERT.l),
    balletPose(0, FIG4_ARMS_HIP_L.r, FIG4_ARMS_L_OUT, balletLegPlie("r", 8), balletLegPlie("l", -8)),
    balletPose(0, FIG4_ARMS_HIP_L.r, FIG4_ARMS_L_OUT, balletLegPlie("r", 12), balletLegPlie("l", -12)),
    balletPose(0, FIG4_ARMS_HIP_L.r, FIG4_ARMS_L_OUT, balletLegPlie("r", 14), balletLegPlie("l", -14)),
    balletPose(0, FIG4_ARMS_HIP_L.r, FIG4_ARMS_L_OUT, [205, 265], FIG4_LEG_VERT.l),
    balletPose(0, FIG4_ARMS_POSE4.r, balletArm("l", 240, 240, 240), [195, 250], FIG4_LEG_VERT.l),
    balletPose(0, FIG4_ARMS_POSE4.r, FIG4_ARMS_POSE4.l, [185, 235], FIG4_LEG_VERT.l),
    balletPose(0, FIG4_ARMS_POSE4.r, FIG4_ARMS_POSE4.l, FIG4_LEG_R_LIFT, FIG4_LEG_VERT.l),
    balletPose(-2, FIG4_ARMS_POSE4.r, FIG4_ARMS_POSE4.l, FIG4_LEG_R_LIFT, FIG4_LEG_VERT.l),
    balletPose(0, FIG4_ARMS_R_UP_L_DOWN.r, FIG4_ARMS_R_UP_L_DOWN.l, [200, 240], FIG4_LEG_VERT.l),
    balletPose(0, FIG4_ARMS_HIP_L.r, FIG4_ARMS_HIP_L.l, balletLegPlie("r", 12), balletLegPlie("l", -12)),
  ];

  const FIG4_SVG = BALLET_SVG;

  function applyFig4Frame(root, frame) {
    applyBalletFrame(root, frame);
  }

  function startFig4Loop(root, startDelay) {
    let idx = 0;
    let timers = [];

    function clearTimers() {
      timers.forEach((id) => clearTimeout(id));
      timers = [];
    }

    function tick() {
      applyFig4Frame(root, FIG4_SEQUENCE[idx]);
      idx = (idx + 1) % FIG4_SEQUENCE.length;
      timers.push(window.setTimeout(tick, FIG4_STEP_MS));
    }

    timers.push(window.setTimeout(tick, startDelay));
    const stop = () => clearTimers();
    loops.push(stop);
    return stop;
  }

  function mountFig4(slot, index) {
    slot.innerHTML = FIG4_SVG;
    const svg = slot.querySelector("svg");
    applyFig4Frame(svg, FIG4_SEQUENCE[0]);
    if (!reduced) {
      startFig4Loop(svg, 2000 + index * 400);
    }
    restarters.push(function () {
      applyFig4Frame(svg, FIG4_SEQUENCE[0]);
      if (!reduced) startFig4Loop(svg, 2000 + index * 400);
    });
  }

  /* Anim. 5: caída boca abajo (brazos/piernas en movimiento) → O → absorción */
  const FALL_O_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -2 100 140" preserveAspectRatio="xMidYMid meet" aria-hidden="true">'
    + '<g class="fig-root">'
    + '<ellipse cx="0" cy="10" rx="5" ry="10" fill="currentColor"/>'
    + '<path fill="currentColor" d="M0 25 C6 25, 10 35, 11 50 C13 68, 14 85, 0 85 C-14 85, -13 68, -11 50 C-10 35, -6 25, 0 25 Z"/>'
    + '<g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">'
    + '<polyline class="fig-arm-r" points="14,32 16,42 19,62 20,67"/>'
    + '<polyline class="fig-arm-l" points="-14,32 -16,42 -19,62 -20,67"/>'
    + '<polyline class="fig-leg-r" points="6,90 6,105 6,130"/>'
    + '<polyline class="fig-leg-l" points="-6,90 -6,105 -6,130"/>'
    + "</g></g></svg>";

  const FALL_ROTATE = "rotate(180 0 70)";
  const FALL_FLAIL_STEP_MS = 180;

  function fallArm(side, a1, a2, a3) {
    const o = side === "r" ? SHOULDER_R : SHOULDER_L;
    return chainPts(o, ARM_LEN, [a1, a2, a3]);
  }

  const FALL_INTERVAL_MS = 7000;
  const FALL_LEGS_STRAIGHT = {
    r: legPts(HIP_R_X, FOOT_R_X, HIP_R_X, 0),
    l: legPts(HIP_L_X, FOOT_L_X, HIP_L_X, 0),
  };

  const FALL_FLAIL_SEQUENCE = [
    { armR: [20, 70, 55], armL: [160, 110, 120] },
    { armR: [35, 80, 60], armL: [155, 100, 115] },
    { armR: [10, 75, 50], armL: [165, 105, 125] },
    { armR: [25, 85, 65], armL: [150, 95, 110] },
  ];

  function fallFlailIndex(elapsedMs) {
    const len = FALL_FLAIL_SEQUENCE.length;
    const i = Math.floor(Math.max(0, elapsedMs) / FALL_FLAIL_STEP_MS) % len;
    return ((i % len) + len) % len;
  }

  function applyFallFlailFrame(svg, frame) {
    if (!svg || !frame) return;
    const root = svg.querySelector(".fig-root");
    if (!root) return;
    root.querySelector(".fig-arm-r").setAttribute("points", fallArm("r", frame.armR[0], frame.armR[1], frame.armR[2]));
    root.querySelector(".fig-arm-l").setAttribute("points", fallArm("l", frame.armL[0], frame.armL[1], frame.armL[2]));
    root.querySelector(".fig-leg-r").setAttribute("points", FALL_LEGS_STRAIGHT.r);
    root.querySelector(".fig-leg-l").setAttribute("points", FALL_LEGS_STRAIGHT.l);
    root.setAttribute("transform", FALL_ROTATE);
  }

  const FALL_VIEW_FOOT_Y = 130;
  const FALL_VIEW_TOP_Y = -12;
  const FALL_VIEW_HEIGHT = 152;

  function mountFallO(slot) {
    const oEl = document.querySelector(".welcome-uomi-o");
    if (!oEl) return;

    slot.innerHTML = FALL_O_SVG;
    const svg = slot.querySelector("svg");
    applyFallFlailFrame(svg, FALL_FLAIL_SEQUENCE[0]);

    let rafId = 0;
    let timeoutIds = [];
    let cycleStart = 0;

    function isHomeVisible() {
      return (
        !document.hidden && document.body.classList.contains("home-page")
      );
    }

    const clearAll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      timeoutIds.forEach((id) => clearTimeout(id));
      timeoutIds = [];
    };

    function footInsetPx() {
      return slot.offsetHeight * ((FALL_VIEW_FOOT_Y - FALL_VIEW_TOP_Y) / FALL_VIEW_HEIGHT);
    }

    /* Hueco interior de la "O" en Inter (proporciones relativas al bounding-box del span).
       ry = 0.38 → hole.bottom al 88 % de la altura del glyph, justo en el borde
       inferior interior de la O. Subir ry si la figura desaparece demasiado pronto;
       bajarlo si desaparece demasiado tarde. */
    const O_HOLE = {
      cx: 0.50,
      cy: 0.50,
      rx: 0.28,
      ry: 0.30,
    };
    O_HOLE.entryY = O_HOLE.cy - O_HOLE.ry;
    O_HOLE.exitY = O_HOLE.cy + O_HOLE.ry;

    function holeViewport(oRect) {
      return {
        cx: oRect.left + oRect.width * O_HOLE.cx,
        cy: oRect.top + oRect.height * O_HOLE.cy,
        top: oRect.top + oRect.height * O_HOLE.entryY,
        bottom: oRect.top + oRect.height * O_HOLE.exitY,
        rx: oRect.width * O_HOLE.rx,
        ry: oRect.height * O_HOLE.ry,
      };
    }

    function enterHoleClip(slotRect, oRect) {
      const hole = holeViewport(oRect);
      const cx = hole.cx - slotRect.left;
      const cy = hole.cy - slotRect.top;
      const clipBottom = Math.max(0, slotRect.bottom - hole.bottom);
      const top = Math.max(0, hole.top - slotRect.top);
      const right = Math.max(0, slotRect.right - oRect.right);
      const bottom = Math.max(clipBottom, slotRect.bottom - oRect.bottom);
      const left = Math.max(0, oRect.left - slotRect.left);
      /* clip-path solo acepta una forma básica: usamos la elipse del hueco de la O.
         La figura se hace visible únicamente dentro del oval del hueco y desaparece al salir. */
      return `ellipse(${hole.rx}px ${hole.ry}px at ${cx}px ${cy}px)`;
    }

    function measure() {
      const o = oEl.getBoundingClientRect();
      const w = slot.offsetWidth;
      const h = slot.offsetHeight;
      const foot = footInsetPx();
      const hole = holeViewport(o);
      const targetHeadY = hole.top;
      const throughHole = hole.bottom - hole.top + h * 0.35;
      return {
        left: o.left + o.width / 2 - w / 2,
        startY: -h - 16,
        endY: targetHeadY - foot,
        enterDepth: throughHole,
      };
    }

    function scheduleNextCycle() {
      if (!isHomeVisible()) return;
      const wait = Math.max(0, FALL_INTERVAL_MS - (performance.now() - cycleStart));
      timeoutIds.push(window.setTimeout(runCycle, wait));
    }

    function runCycle() {
      if (!isHomeVisible()) return;
      clearAll();
      cycleStart = performance.now();
      slot.style.clipPath = "none";
      slot.style.visibility = "visible";
      applyFallFlailFrame(svg, FALL_FLAIL_SEQUENCE[0]);

      const m = measure();
      slot.style.left = `${m.left}px`;

      const fallMs = 2200;
      const enterMs = 1100;
      const t0 = performance.now();

      function fallFrame(now) {
        const t = Math.min(1, (now - t0) / fallMs);
        const y = m.startY + (m.endY - m.startY) * t;
        applyFallFlailFrame(svg, FALL_FLAIL_SEQUENCE[fallFlailIndex(now - t0)]);
        slot.style.clipPath = "none";
        slot.style.transform = `translate3d(0,${y}px,0)`;
        if (t < 1) {
          rafId = requestAnimationFrame(fallFrame);
          return;
        }
        const t1 = performance.now();

        function enterFrame(now) {
          const u = Math.min(1, (now - t1) / enterMs);
          const y = m.endY + m.enterDepth * u;
          applyFallFlailFrame(svg, FALL_FLAIL_SEQUENCE[fallFlailIndex(now - t1)]);
          slot.style.transform = `translate3d(0,${y}px,0)`;
          const oNow = oEl.getBoundingClientRect();
          const slotNow = slot.getBoundingClientRect();
          const hole = holeViewport(oNow);
          // El clip arranca exactamente cuando el fondo del slot llega al borde
          // inferior del hueco (clipFromBottom = 0 → transición sin salto).
          // A medida que la figura sigue cayendo, el recorte crece y las piernas
          // desaparecen progresivamente por debajo del borde inferior de la O.
          if (slotNow.bottom >= hole.bottom) {
            const clipFromBottom = slotNow.bottom - hole.bottom;
            slot.style.clipPath = `inset(0 0 ${clipFromBottom}px 0)`;
          } else {
            slot.style.clipPath = "none";
          }
          if (u < 1) {
            rafId = requestAnimationFrame(enterFrame);
            return;
          }
          slot.style.clipPath = "none";
          slot.style.visibility = "hidden";
          slot.style.transform = "";
          scheduleNextCycle();
        }

        rafId = requestAnimationFrame(enterFrame);
      }

      slot.style.transform = `translate3d(0,${m.startY}px,0)`;
      rafId = requestAnimationFrame(fallFrame);
    }

    const onResize = () => {
      clearAll();
      runCycle();
    };

    const onVisibility = () => {
      if (!isHomeVisible()) {
        clearAll();
        return;
      }
      if (!rafId && !timeoutIds.length) {
        runCycle();
      }
    };

    if (!reduced) {
      requestAnimationFrame(() => {
        requestAnimationFrame(runCycle);
      });
      window.addEventListener("resize", onResize, { passive: true });
      document.addEventListener("visibilitychange", onVisibility);
    }

    const stop = () => {
      clearAll();
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      slot.style.clipPath = "none";
      slot.style.visibility = "hidden";
      slot.style.transform = "";
    };

    loops.push(stop);
    restarters.push(function () {
      stop();
      if (!reduced) {
        requestAnimationFrame(() => {
          requestAnimationFrame(runCycle);
        });
        window.addEventListener("resize", onResize, { passive: true });
        document.addEventListener("visibilitychange", onVisibility);
      }
    });
  }

  let figIndex = 0;
  document.querySelectorAll(".home-fig[data-home-anim]").forEach((slot) => {
    const type = slot.getAttribute("data-home-anim");
    if (type === "leg-sway") {
      mountLegSway(slot, figIndex);
      figIndex += 1;
    } else if (type === "egyptian-dance") {
      mountEgyptian(slot, figIndex);
      figIndex += 1;
    } else if (type === "ballet") {
      mountBallet(slot, figIndex);
      figIndex += 1;
    } else if (type === "figure-4") {
      mountFig4(slot, figIndex);
      figIndex += 1;
    } else if (type === "fall-o") {
      mountFallO(slot);
      figIndex += 1;
    }
  });

  window.addEventListener(
    "pageshow",
    (ev) => {
      if (!ev.persisted) return;
      loops.forEach((stop) => stop());
      loops.length = 0;
      restarters.forEach((restart) => restart());
    },
    { passive: true }
  );
})();


/* ═══════════════════════════════════════════════════════════════════════════
   SHOP PAGE — render product cards
   Only runs on pages with <body class="shop-page">
═══════════════════════════════════════════════════════════════════════════ */
(function shopPage() {
  if (!document.body.classList.contains("shop-page")) return;

  var grid  = document.getElementById("productGrid");
  var prods = window.PRODUCTS;
  if (!grid || !prods || !prods.length) return;

  grid.className = "shop-grid";
  grid.innerHTML = prods.map(function (p) {
    var buyBtn = p.available
      ? '<a class="btn-buy-now" href="' + p.stripeLink + '" target="_blank" rel="noopener noreferrer">Buy Now</a>'
      : '<span class="sold-label">Sold</span>';

    return '<article class="shop-card">'
      + '<div class="shop-card-img">'
        + '<img src="' + p.image + '" alt="' + p.alt + '" loading="lazy"/>'
      + '</div>'
      + '<div class="shop-card-body">'
        + '<p class="shop-card-type">' + p.type + '</p>'
        + '<h3>' + p.title + '</h3>'
        + '<p class="shop-card-desc">' + p.description + '</p>'
        + '<div class="shop-card-footer">'
          + '<span class="shop-card-price">\u20ac' + p.priceEUR + '</span>'
          + buyBtn
        + '</div>'
      + '</div>'
    + '</article>';
  }).join("");
})();