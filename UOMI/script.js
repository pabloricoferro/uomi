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

  /* Caída: el muñeco acelera con la gravedad, da vueltas (voltereta lenta que se
     endereza cabeza abajo justo antes de entrar en la O), se balancea de lado a lado
     por el aire y mueve brazos y piernas de forma continua, con codos y rodillas. */
  const FALL_INTERVAL_MS = 7000;
  const FALL_HEAD_DOWN = 180;     // orientación al entrar en la O (cabeza hacia abajo)
  const FALL_FLAIL_HZ = 2.7;      // aleteo de brazos y piernas por segundo
  const FALL_LEG_UPPER = 15;
  const FALL_LEG_LOWER = 25;
  const FALL_HIP_Y = 90;
  const FALL_PIVOT = "0 70";

  function fallSin(w, phase) { return Math.sin(w + phase); }

  /* ms: tiempo desde que empezó la caída; theta: giro del cuerpo en grados;
     calm (0..1): reduce el aleteo al entrar en la O. */
  function applyFallPose(svg, ms, theta, calm) {
    if (!svg) return;
    const root = svg.querySelector(".fig-root");
    if (!root) return;
    const amp = 1 - 0.35 * calm;
    const w = (ms / 1000) * Math.PI * 2 * FALL_FLAIL_HZ;
    /* Ángulos en grados "matemáticos" (0 = derecha, 90 = arriba), como chainPts.
       Con el cuerpo boca abajo, los brazos arriba quedan hacia atrás: el aire los levanta. */
    const sR = 50 + 34 * amp * fallSin(w, 0);
    const eR = sR + 10 + 16 * amp * fallSin(w, -0.9);
    const hR = eR + 10 * amp * fallSin(w, -1.7);
    const sL = 130 - 34 * amp * fallSin(w, 2.4);
    const eL = sL - 10 - 16 * amp * fallSin(w, 1.5);
    const hL0 = eL - 10 * amp * fallSin(w, 0.7);
    /* los brazos nunca se cruzan: el derecho se queda a la derecha del eje, el izquierdo a la izquierda */
    const sRc = Math.min(sR, 86), eRc = Math.min(eR, 88), hRc = Math.min(hR, 90);
    const sLc = Math.max(sL, 94), eLc = Math.max(eL, 92), hLc = Math.max(hL0, 90);
    root.querySelector(".fig-arm-r").setAttribute("points", chainPts(SHOULDER_R, ARM_LEN, [sRc, eRc, hRc]));
    root.querySelector(".fig-arm-l").setAttribute("points", chainPts(SHOULDER_L, ARM_LEN, [sLc, eLc, hLc]));
    /* piernas: el muslo se abre y la rodilla se dobla hacia atrás, en contrafase */
    const tR = -90 + 26 * amp * fallSin(w, 1.0);
    const kR = tR - 12 - 22 * amp * (0.5 + 0.5 * fallSin(w, 1.0 + 0.8));
    const tL = -90 - 26 * amp * fallSin(w, 2.2);
    const kL = tL + 12 + 22 * amp * (0.5 + 0.5 * fallSin(w, 2.2 + 0.8));
    root.querySelector(".fig-leg-r").setAttribute("points", chainPts([HIP_R_X, FALL_HIP_Y], [FALL_LEG_UPPER, FALL_LEG_LOWER], [tR, kR]));
    root.querySelector(".fig-leg-l").setAttribute("points", chainPts([HIP_L_X, FALL_HIP_Y], [FALL_LEG_UPPER, FALL_LEG_LOWER], [tL, kL]));
    root.style.transition = "none";
    root.setAttribute("transform", "rotate(" + theta.toFixed(2) + " " + FALL_PIVOT + ")");
  }

  const FALL_VIEW_FOOT_Y = 130;
  const FALL_VIEW_TOP_Y = -12;
  const FALL_VIEW_HEIGHT = 152;

  function mountFallO(slot) {
    const oEl = document.querySelector(".welcome-uomi-o");
    if (!oEl) return;

    slot.innerHTML = FALL_O_SVG;
    const svg = slot.querySelector("svg");
    applyFallPose(svg, 0, 110, 0);

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
    /* La «O» de la página es ahora un óvalo negro macizo (ver .welcome-uomi-o en styles.css):
       el span mide exactamente el óvalo, así que la figura entra por su borde superior (5 %)
       y desaparece al pasar su borde inferior (95 %). */
    const O_HOLE = {
      cx: 0.50,
      cy: 0.50,
      rx: 0.50,
      ry: 0.45,
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
      slot.style.opacity = "1";
      slot.style.visibility = "visible";
      applyFallPose(svg, 0, 110, 0);

      const m = measure();
      slot.style.left = `${m.left}px`;

      /* Una sola caída con gravedad constante: y = startY + ½·g·t².
         Llega a la O ya a toda velocidad y la atraviesa sin frenar. */
      const fallMs = 2700;
      const dist = m.endY - m.startY;
      const g = (2 * dist) / (fallMs * fallMs);            // px / ms²
      const total = m.endY + m.enterDepth;
      const t0 = performance.now();
      const easeOut = (x) => 1 - (1 - x) * (1 - x);

      function frame(now) {
        const dt = now - t0;
        const y = m.startY + 0.5 * g * dt * dt;
        const p = Math.min(1, Math.max(0, (y - m.startY) / dist));   // 0 arriba … 1 en la O
        /* voltereta: empieza de lado y se endereza cabeza abajo al llegar a la O,
           con un pequeño bamboleo que se apaga */
        const inv = 1 - p;
        const theta = FALL_HEAD_DOWN - 80 * inv * inv + 14 * Math.sin(p * 10) * inv;
        /* deriva lateral suave, como si el aire lo empujara */
        const sway = 7 * Math.sin(p * 6.5 + 0.6) * inv;
        const entering = y > m.endY;
        const u = entering ? Math.min(1, (y - m.endY) / m.enterDepth) : 0;
        applyFallPose(svg, dt, theta, easeOut(Math.min(1, p)));
        slot.style.transform = `translate3d(${sway}px,${y}px,0)`;
        if (!entering) {
          slot.style.clipPath = "none";
          rafId = requestAnimationFrame(frame);
          return;
        }
        /* se hunde en la O: se desvanece y el fondo del slot se recorta al pasar el
           borde inferior del hueco (sin brazos/piernas sueltos) */
        slot.style.opacity = String(Math.max(0, 1 - u * 1.15) ** 1.4);
        const oNow = oEl.getBoundingClientRect();
        const slotNow = slot.getBoundingClientRect();
        const hole = holeViewport(oNow);
        if (slotNow.bottom >= hole.bottom) {
          slot.style.clipPath = `inset(0 0 ${slotNow.bottom - hole.bottom}px 0)`;
        } else {
          slot.style.clipPath = "none";
        }
        if (y < total) {
          rafId = requestAnimationFrame(frame);
          return;
        }
        slot.style.clipPath = "none";
        slot.style.visibility = "hidden";
        slot.style.opacity = "1";
        slot.style.transform = "";
        scheduleNextCycle();
      }

      slot.style.transform = `translate3d(0,${m.startY}px,0)`;
      rafId = requestAnimationFrame(frame);
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
      // Wait for web fonts before measuring the O's bounding rect.
      // On first load the fallback font gives wrong dimensions; fonts.ready
      // guarantees the correct layout before we compute m.left.
      document.fonts.ready.then(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(runCycle);
        });
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
   NEWSLETTER POPUP
   Shown 2.5 s after page load on the first visit (or after 7 days if
   previously dismissed). Collects: Email, Name, Country, Date of Birth, Sex.
   Emails are sent to a Google Apps Script Web App which writes them to a
   Google Sheet (downloadable as .xlsx from Drive).
   Duplicate detection is handled server-side; result is shown to the user.

   ► Setup: deploy your Google Apps Script and paste the Web App URL below.
            See NEWSLETTER_SETUP.md for step-by-step instructions.
═══════════════════════════════════════════════════════════════════════════ */
(function newsletterPopup() {
  /* ── Configuration ─────────────────────────────────────────────────── */
  var SCRIPT_URL   = 'https://script.google.com/macros/s/AKfycbzNId42fLX8gY4pK3_wvCeUu1fP6POuOvXR4zdXK4_ry51x0NqxJuXnWjzBd60Cn4L5sg/exec';
  var SHOW_DELAY   = 1000; // ms before popup appears
  var DISMISS_DAYS = 7;    // days to wait before re-showing after "No thanks"

  /* ── localStorage keys ─────────────────────────────────────────────── */
  var LS_EMAILS    = 'uomi-nl-emails';   // JSON array of subscribed emails
  var LS_DISMISSED = 'uomi-nl-dismissed';

  function getSubscribedEmails() {
    try { return JSON.parse(localStorage.getItem(LS_EMAILS) || '[]'); }
    catch (err) { return []; }
  }

  function isEmailSubscribed(email) {
    return getSubscribedEmails().indexOf(email.toLowerCase()) !== -1;
  }

  function markEmailSubscribed(email) {
    var list = getSubscribedEmails();
    email = email.toLowerCase();
    if (list.indexOf(email) === -1) list.push(email);
    localStorage.setItem(LS_EMAILS, JSON.stringify(list));
  }

  /* ── Guard: dismissed recently? ────────────────────────────────────── */
  var dismissedAt = parseInt(localStorage.getItem(LS_DISMISSED) || '0', 10);
  var recentlyDismissed = dismissedAt && (Date.now() - dismissedAt) < DISMISS_DAYS * 86400000;

  /* ── Country list ───────────────────────────────────────────────────── */
  var COUNTRIES = [
    'Afghanistan','Albania','Algeria','Andorra','Angola','Antigua and Barbuda',
    'Argentina','Armenia','Australia','Austria','Azerbaijan','Bahamas','Bahrain',
    'Bangladesh','Barbados','Belarus','Belgium','Belize','Benin','Bhutan',
    'Bolivia','Bosnia and Herzegovina','Botswana','Brazil','Brunei','Bulgaria',
    'Burkina Faso','Burundi','Cabo Verde','Cambodia','Cameroon','Canada',
    'Central African Republic','Chad','Chile','China','Colombia','Comoros',
    'Congo','Costa Rica','Croatia','Cuba','Cyprus','Czechia','Denmark',
    'Djibouti','Dominica','Dominican Republic','DR Congo','Ecuador','Egypt',
    'El Salvador','Equatorial Guinea','Eritrea','Estonia','Eswatini','Ethiopia',
    'Fiji','Finland','France','Gabon','Gambia','Georgia','Germany','Ghana',
    'Greece','Grenada','Guatemala','Guinea','Guinea-Bissau','Guyana','Haiti',
    'Honduras','Hungary','Iceland','India','Indonesia','Iran','Iraq','Ireland',
    'Israel','Italy','Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kiribati',
    'Kuwait','Kyrgyzstan','Laos','Latvia','Lebanon','Lesotho','Liberia','Libya',
    'Liechtenstein','Lithuania','Luxembourg','Madagascar','Malawi','Malaysia',
    'Maldives','Mali','Malta','Marshall Islands','Mauritania','Mauritius',
    'Mexico','Micronesia','Moldova','Monaco','Mongolia','Montenegro','Morocco',
    'Mozambique','Myanmar','Namibia','Nauru','Nepal','Netherlands','New Zealand',
    'Nicaragua','Niger','Nigeria','North Korea','North Macedonia','Norway',
    'Oman','Pakistan','Palau','Palestine','Panama','Papua New Guinea','Paraguay',
    'Peru','Philippines','Poland','Portugal','Qatar','Romania','Russia','Rwanda',
    'Saint Kitts and Nevis','Saint Lucia','Saint Vincent and the Grenadines',
    'Samoa','San Marino','São Tomé and Príncipe','Saudi Arabia','Senegal',
    'Serbia','Seychelles','Sierra Leone','Singapore','Slovakia','Slovenia',
    'Solomon Islands','Somalia','South Africa','South Korea','South Sudan',
    'Spain','Sri Lanka','Sudan','Suriname','Sweden','Switzerland','Syria',
    'Tajikistan','Tanzania','Thailand','Timor-Leste','Togo','Tonga',
    'Trinidad and Tobago','Tunisia','Turkey','Turkmenistan','Tuvalu','Uganda',
    'Ukraine','United Arab Emirates','United Kingdom','United States','Uruguay',
    'Uzbekistan','Vanuatu','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe'
  ];

  /* ── i18n helper ────────────────────────────────────────────────────── */
  function nt(key, fallback) {
    return window.UOMI_I18N ? window.UOMI_I18N.t(key) : fallback;
  }

  /* ── DOM references (set after createPopup) ─────────────────────────── */
  var overlay, emailInput, nameInput, countrySelect, dobInput, sexSelect,
      submitBtn, statusEl, waveArm;

  /* ── Build & inject popup HTML ──────────────────────────────────────── */
  function createPopup() {
    overlay = document.createElement('div');
    overlay.id = 'nl-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'nl-title');

    var countryOpts = COUNTRIES.map(function(c) {
      return '<option value="' + c + '">' + c + '</option>';
    }).join('');

    overlay.innerHTML =
      '<div id="nl-popup">' +
        '<button id="nl-close" aria-label="Close">&times;</button>' +
        '<div id="nl-icon" aria-hidden="true">' +
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -10 100 148"' +
              ' preserveAspectRatio="xMidYMid meet">' +
            '<ellipse cx="0" cy="10" rx="5" ry="10" fill="currentColor"/>' +
            '<path fill="currentColor" d="M0 25 C6 25,10 35,11 50 C13 68,14 85,0 85' +
              ' C-14 85,-13 68,-11 50 C-10 35,-6 25,0 25 Z"/>' +
            '<g fill="none" stroke="currentColor" stroke-width="3"' +
                ' stroke-linecap="round" stroke-linejoin="round">' +
              '<polyline id="nl-arm-r" points="14,32 16,42 19,62 20,67"/>' +
              '<polyline points="-14,32 -16,42 -19,62 -20,67"/>' +
              '<polyline points="6,90 6,105 6,130"/>' +
              '<polyline points="-6,90 -6,105 -6,130"/>' +
            '</g>' +
          '</svg>' +
        '</div>' +
        '<h2 id="nl-title">' + nt('nl.title', 'Stay in the loop') + '</h2>' +
        '<p>' + nt('nl.sub', 'Be the first to know about new pieces and studio news.') + '</p>' +
        '<form id="nl-form" novalidate>' +
          '<div class="nl-row">' +
            '<input type="email" id="nl-email" placeholder="' + nt('nl.email', 'Email *') + '"' +
              ' required autocomplete="email"/>' +
            '<input type="text" id="nl-name" placeholder="' + nt('nl.name', 'Name *') + '"' +
              ' required autocomplete="name"/>' +
          '</div>' +
          '<select id="nl-country" required>' +
            '<option value="" disabled selected>' + nt('nl.country', 'Country *') + '</option>' +
            countryOpts +
          '</select>' +
          '<div class="nl-field">' +
            '<label for="nl-dob" class="nl-label">' + nt('nl.dob', 'Date of Birth *') + '</label>' +
            '<input type="date" id="nl-dob" required/>' +
          '</div>' +
          '<select id="nl-sex" required>' +
            '<option value="" disabled selected>' + nt('nl.sex', 'Sex *') + '</option>' +
            '<option value="Male">' + nt('nl.sex.male', 'Male') + '</option>' +
            '<option value="Female">' + nt('nl.sex.female', 'Female') + '</option>' +
            '<option value="Special">' + nt('nl.sex.special', 'Special') + '</option>' +
            '<option value="Rather not say">' + nt('nl.sex.rather', "I'd rather not say") + '</option>' +
          '</select>' +
          '<button type="submit" id="nl-submit">' + nt('nl.submit', 'Subscribe') + '</button>' +
        '</form>' +
        '<p id="nl-status" role="status" aria-live="polite"></p>' +
        '<button id="nl-skip">' + nt('nl.skip', 'No thanks') + '</button>' +
      '</div>';

    document.body.appendChild(overlay);

    emailInput    = document.getElementById('nl-email');
    nameInput     = document.getElementById('nl-name');
    countrySelect = document.getElementById('nl-country');
    dobInput      = document.getElementById('nl-dob');
    sexSelect     = document.getElementById('nl-sex');
    submitBtn     = document.getElementById('nl-submit');
    statusEl      = document.getElementById('nl-status');
    waveArm       = document.getElementById('nl-arm-r');

    document.getElementById('nl-close').addEventListener('click', function() { dismiss(false); });
    document.getElementById('nl-skip').addEventListener('click', function() { dismiss(false); });
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) dismiss(false);
    });
    document.getElementById('nl-form').addEventListener('submit', onSubmit);
    document.addEventListener('keydown', onKeyDown);
  }

  /* ── Show ───────────────────────────────────────────────────────────── */
  function show() {
    if (overlay && overlay.parentNode) return; // already open
    createPopup();
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        overlay.classList.add('nl-visible');
        emailInput.focus();
        startWave();
      });
    });
  }

  /* ── Dismiss ────────────────────────────────────────────────────────── */
  function dismiss(permanent) {
    document.removeEventListener('keydown', onKeyDown);
    overlay.classList.remove('nl-visible');
    if (!permanent) localStorage.setItem(LS_DISMISSED, String(Date.now()));
    window.setTimeout(function() {
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 350);
  }

  /* ── Keyboard ───────────────────────────────────────────────────────── */
  function onKeyDown(e) {
    if (e.key === 'Escape') dismiss(false);
  }

  /* ── Wave arm animation ─────────────────────────────────────────────── */
  function startWave() {
    if (!waveArm) return;
    var frames = [
      '14,32 16,42 19,62 20,67',
      '14,32 24,32 44,32 49,32',
      '14,32 24,32 24,12 24,7',
      '14,32 24,32 17,13 15,9',
      '14,32 24,32 31,13 33,9',
      '14,32 24,32 17,13 15,9',
      '14,32 24,32 31,13 33,9',
      '14,32 24,32 24,12 24,7',
      '14,32 24,32 44,32 49,32',
      '14,32 16,42 19,62 20,67',
    ];
    frames.forEach(function(pts, i) {
      window.setTimeout(function() {
        if (waveArm) waveArm.setAttribute('points', pts);
      }, 500 + i * 230);
    });
  }

  /* ── Status helper ──────────────────────────────────────────────────── */
  function setStatus(msg, cls) {
    statusEl.textContent = msg;
    statusEl.className = cls || '';
  }

  /* ── Form submit ────────────────────────────────────────────────────── */
  function onSubmit(e) {
    e.preventDefault();

    var email   = emailInput.value.trim().toLowerCase();
    var name    = nameInput.value.trim();
    var country = countrySelect.value;
    var dob     = dobInput.value;
    var sex     = sexSelect.value;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus(nt('nl.err.email', 'Please enter a valid email address.'), 'nl-error');
      emailInput.focus();
      return;
    }
    if (!name) {
      setStatus(nt('nl.err.name', 'Please enter your name.'), 'nl-error');
      nameInput.focus();
      return;
    }
    if (!country) {
      setStatus(nt('nl.err.country', 'Please select your country.'), 'nl-error');
      countrySelect.focus();
      return;
    }
    if (!dob) {
      setStatus(nt('nl.err.dob', 'Please enter your date of birth.'), 'nl-error');
      dobInput.focus();
      return;
    }
    if (!sex) {
      setStatus(nt('nl.err.sex', 'Please select an option for sex.'), 'nl-error');
      sexSelect.focus();
      return;
    }

    if (isEmailSubscribed(email)) {
      setStatus(nt('nl.duplicate', 'This email is already subscribed.'), 'nl-info');
      window.setTimeout(function() { dismiss(false); }, 2500);
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = nt('nl.submitting', 'Subscribing\u2026');
    setStatus('');

    if (!SCRIPT_URL) {
      markEmailSubscribed(email);
      setStatus('Subscribed! (demo mode)', 'nl-success');
      window.setTimeout(function() { dismiss(true); }, 2000);
      return;
    }

    /* ── JSONP — only method that reliably follows Google's redirect chain ── */
    var cbName = 'nl_cb_' + Date.now();
    var tag    = document.createElement('script');
    var done   = false;
    var timer  = null;

    var qs = 'email='    + encodeURIComponent(email)
           + '&name='    + encodeURIComponent(name)
           + '&country=' + encodeURIComponent(country)
           + '&sex='     + encodeURIComponent(sex)
           + '&age='     + encodeURIComponent(dob)
           + '&callback='+ encodeURIComponent(cbName);

    function cleanup() {
      clearTimeout(timer);
      delete window[cbName];
      if (tag.parentNode) tag.parentNode.removeChild(tag);
    }

    function onSuccess() {
      if (done) return;
      done = true;
      cleanup();
      markEmailSubscribed(email);
      submitBtn.disabled = false;
      submitBtn.textContent = nt('nl.submit', 'Subscribe');
      setStatus(nt('nl.success', 'Thank you for subscribing!'), 'nl-success');
      window.setTimeout(function() { dismiss(true); }, 2000);
    }

    function onError(msg) {
      if (done) return;
      done = true;
      cleanup();
      submitBtn.disabled = false;
      submitBtn.textContent = nt('nl.submit', 'Subscribe');
      setStatus(msg || nt('nl.err.connection', 'Connection error. Please try again.'), 'nl-error');
    }

    window[cbName] = function(data) {
      if (!data) { onError(); return; }
      if (data.status === 'duplicate') {
        done = true;
        cleanup();
        setStatus(nt('nl.duplicate', 'This email is already subscribed.'), 'nl-info');
        window.setTimeout(function() { dismiss(false); }, 2500);
        return;
      }
      onSuccess();
    };

    tag.src    = SCRIPT_URL + '?' + qs;
    tag.onerror = function() { onError(); };
    timer = window.setTimeout(function() { onError(nt('nl.err.timeout', 'Request timed out. Please try again.')); }, 10000);
    document.head.appendChild(tag);
  }

  /* ── Kick off ───────────────────────────────────────────────────────── */
  if (!recentlyDismissed) window.setTimeout(show, SHOW_DELAY);

  /* Footer "Subscribe" buttons open the same popup on demand */
  document.querySelectorAll('[data-nl-open]').forEach(function(btn) {
    btn.addEventListener('click', show);
  });
})();


/* ═══════════════════════════════════════════════════════════════════════════
   SHOP PAGE — render product cards with quantity selector
   Only runs on pages with <body class="shop-page">
═══════════════════════════════════════════════════════════════════════════ */
(function shopPage() {
  if (!document.body.classList.contains("shop-page")) return;

  var grid  = document.getElementById("productGrid");
  var prods = window.PRODUCTS;
  if (!grid || !prods || !prods.length) return;

  var SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzNId42fLX8gY4pK3_wvCeUu1fP6POuOvXR4zdXK4_ry51x0NqxJuXnWjzBd60Cn4L5sg/exec";
  var i18n = window.UOMI_I18N;
  function tr(key, fallback) { return i18n ? i18n.t(key) : fallback; }

  function soldHtml() {
    return '<span class="sold-label" data-i18n="shop.sold">' + tr("shop.sold", "Sold") + "</span>";
  }

  function footerHtml(p, sold) {
    if (sold) return soldHtml();
    var buy = "";
    if (p.stripeLink) {
      var link = p.stripeLink
        + (p.stripeLink.indexOf("?") === -1 ? "?" : "&")
        + "client_reference_id=" + encodeURIComponent(p.id);
      buy = '<a class="btn-buy-now" href="' + link + '" rel="noopener noreferrer" data-i18n="shop.buy">' + tr("shop.buy", "Buy Now") + "</a>";
    }
    return '<span class="shop-card-price">€' + p.priceEUR + "</span>" + buy;
  }

  grid.className = "shop-grid";
  grid.innerHTML = prods.map(function (p) {
    var imgs = p.images && p.images.length ? p.images : [];
    var many = imgs.length > 1;
    return '<article class="shop-card" data-id="' + p.id + '" data-type="' + p.type + '" data-price="' + p.priceEUR + '">'
      + '<div class="shop-card-img" data-index="0">'
        + imgs.map(function (src, i) {
            return '<img src="' + src + '" alt="' + p.type + '" loading="lazy"' + (i === 0 ? "" : " hidden") + "/>";
          }).join("")
        + (many
            ? '<button type="button" class="shop-img-nav prev" aria-label="Previous image">&#8249;</button>'
            + '<button type="button" class="shop-img-nav next" aria-label="Next image">&#8250;</button>'
            + '<span class="shop-img-count">1 / ' + imgs.length + "</span>"
            : "")
      + "</div>"
      + '<div class="shop-card-body">'
        + '<p class="shop-card-type" data-i18n="type.' + p.type + '">' + tr("type." + p.type, p.type) + "</p>"
        + '<div class="shop-card-footer">' + footerHtml(p, p.available === false) + "</div>"
      + "</div>"
    + "</article>";
  }).join("");

  /* Filters: by type and by price range */
  var TYPES  = ["ashtray", "small", "large", "mug", "bowl", "vase", "plate", "jewelry"];
  var PRICE_MAX = 220;

  function option(value, key, fallback) {
    return '<option value="' + value + '" data-i18n="' + key + '">' + tr(key, fallback) + "</option>";
  }

  var bar = document.createElement("div");
  bar.className = "shop-filters";
  bar.innerHTML =
    '<label><span data-i18n="shop.filter.type">' + tr("shop.filter.type", "Type") + "</span>"
    + '<select id="filterType">' + option("", "shop.filter.all", "All")
    + TYPES.map(function (t) { return option(t, "type." + t, t); }).join("")
    + "</select></label>"
    + '<div class="price-filter"><span class="price-filter-title" data-i18n="shop.filter.price">' + tr("shop.filter.price", "Price") + "</span>"
    + '<div class="price-slider">'
      + '<div class="price-track"></div>'
      + '<input type="range" id="priceMin" min="0" max="' + PRICE_MAX + '" step="1" value="0" aria-label="Minimum price"/>'
      + '<input type="range" id="priceMax" min="0" max="' + PRICE_MAX + '" step="1" value="' + PRICE_MAX + '" aria-label="Maximum price"/>'
    + "</div>"
    + '<span class="price-values" id="priceValues"></span></div>';
  grid.parentNode.insertBefore(bar, grid);

  var empty = document.createElement("p");
  empty.className = "shop-empty-filter";
  empty.hidden = true;
  empty.setAttribute("data-i18n", "shop.filter.empty");
  empty.textContent = tr("shop.filter.empty", "No pieces match these filters.");
  grid.parentNode.insertBefore(empty, grid.nextSibling);

  function applyFilters() {
    var type  = document.getElementById("filterType").value;
    var minEl = document.getElementById("priceMin");
    var maxEl = document.getElementById("priceMax");
    var lo = Math.min(+minEl.value, +maxEl.value);
    var hi = Math.max(+minEl.value, +maxEl.value);
    document.getElementById("priceValues").textContent = "€" + lo + " – €" + hi;

    // coloured part of the track between the two handles
    var track = bar.querySelector(".price-track");
    track.style.setProperty("--lo", (lo / PRICE_MAX * 100) + "%");
    track.style.setProperty("--hi", (hi / PRICE_MAX * 100) + "%");

    var shown = 0;
    grid.querySelectorAll(".shop-card").forEach(function (card) {
      var price = parseFloat(card.getAttribute("data-price"));
      var ok = (!type || card.getAttribute("data-type") === type)
            && price >= lo && price <= hi;
      card.hidden = !ok;
      if (ok) shown++;
    });
    empty.hidden = shown > 0;
  }
  bar.addEventListener("input", applyFilters);
  bar.addEventListener("change", applyFilters);
  applyFilters();

  /* Image carousel: previous / next */
  grid.addEventListener("click", function (e) {
    var btn = e.target.closest(".shop-img-nav");
    if (!btn) return;
    var box  = btn.parentNode;
    var imgs = box.querySelectorAll("img");
    var idx  = parseInt(box.getAttribute("data-index"), 10) || 0;
    idx = (idx + (btn.classList.contains("next") ? 1 : -1) + imgs.length) % imgs.length;
    imgs.forEach(function (im, i) { im.hidden = i !== idx; });
    box.setAttribute("data-index", idx);
    box.querySelector(".shop-img-count").textContent = (idx + 1) + " / " + imgs.length;
  });

  /* Automatic "Sold": ask the Orders sheet which pieces already have a paid order */
  function markSold(ids) {
    ids.forEach(function (id) {
      var card = grid.querySelector('.shop-card[data-id="' + id + '"]');
      var p = prods.filter(function (x) { return x.id === id; })[0];
      if (!card || !p) return;
      card.querySelector(".shop-card-footer").innerHTML = soldHtml();
    });
  }

  (function loadSold() {
    var cb  = "sold_cb_" + Date.now();
    var tag = document.createElement("script");
    window[cb] = function (data) {
      if (data && data.sold) markSold(data.sold);
      delete window[cb];
      if (tag.parentNode) tag.parentNode.removeChild(tag);
    };
    tag.src = SCRIPT_URL + "?action=sold&callback=" + cb;
    tag.onerror = function () { delete window[cb]; };
    document.head.appendChild(tag);
  })();

  if (i18n && i18n.apply) i18n.apply();
})();


/* ═══════════════════════════════════════════════════════════════════════════
   TOPBAR RACE — 12 UOMI figures race along the whole bar, from the left edge of
   the screen to the right edge, all on the same line, each at a different speed
   and with its own running style. A new race every RACE_EVERY ms.

   The figures are drawn on a <canvas> at the screen's real pixel density (so
   they stay sharp) with the same anatomy as the UOMI designs in figures.js:
     head oval · egg body · arm = 10 + 20 + 5 (shoulder, elbow, wrist, hand)
     leg = 15 + 25 (hip, knee, ankle)
   Joint angles come from a simple run cycle (thigh swing, knee flexion that
   peaks while the leg recovers, opposite arm swing with bent elbow, forward
   lean, small bounce). Not shown if the visitor prefers reduced motion.
═══════════════════════════════════════════════════════════════════════════ */
(function topbarRace() {
  var RUNNERS    = 12;
  var RACE_EVERY = 25000; // ms between race starts (a race lasts up to ~14.5 s incl. the tripper)
  var MIN_TIME   = 5500;  // ms — fastest possible runner
  var MAX_TIME   = 10500; // ms — slowest possible runner (must stay < RACE_EVERY)
  var FIRST_RACE = 2500;  // ms after page load for the first race
  var FIG_H      = 62;    // px, figure height (head top to feet)
  var COLOR      = "#111";

  var topbar = document.querySelector(".topbar");
  if (!topbar) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var lane = document.createElement("div");
  lane.className = "runner-lane";
  lane.setAttribute("aria-hidden", "true");
  var canvas = document.createElement("canvas");
  lane.appendChild(canvas);
  topbar.appendChild(lane);
  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var W = 0, H = 0, DPR = 1;
  function resize() {
    var r = topbar.getBoundingClientRect();
    DPR = window.devicePixelRatio || 1;
    W = Math.round(r.width);
    H = Math.round(r.height);
    lane.style.width    = W + "px";
    canvas.style.width  = W + "px";
    canvas.style.height = H + "px";
    canvas.width  = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
  }
  resize();
  window.addEventListener("resize", resize);

  /* ── Figure geometry (design units, as in figures.js) ────────────────────── */
  var UNITS_H = 134;           // head top (0) … feet (130) + stroke
  var HIP_Y   = 88;            // body rotates around this point
  var ARM     = [10, 20, 5];   // upper arm, forearm, hand
  var LEG     = [15, 25];      // thigh, shin
  var FOOT_Y  = 130;           // ground line in design units

  var BODY = new Path2D(
    "M0 25 C6 25,10 35,11 50 C13 68,14 85,0 85 C-14 85,-13 68,-11 50 C-10 35,-6 25,0 25 Z");

  /* Angles are measured from "straight down"; forward (+x) is positive. */
  function chain(x, y, lens, angs) {
    var pts = [[x, y]];
    for (var i = 0; i < lens.length; i++) {
      x += Math.sin(angs[i]) * lens[i];
      y += Math.cos(angs[i]) * lens[i];
      pts.push([x, y]);
    }
    return pts;
  }

  /* Ciclo de carrera con posiciones clave de la biomecánica (vista lateral, 8 cuadros por zancada).
     Fase de la pierna: 0 = apoya el pie delante, 0.25 = apoyo medio (pierna bajo el cuerpo),
     0.5 = despegue, 0.62-0.75 = el talón sube hacia el glúteo, 0.88 = la rodilla adelanta y baja el pie.
     Ángulos en grados desde "recto abajo"; muslo adelante (+); rodilla = flexión de la pierna hacia atrás. */
  var RUN_THIGH = [32, 14, -2, -20, -26, -8, 22, 42];
  var RUN_KNEE  = [18, 38, 28, 22, 55, 105, 105, 55];
  var D2R = Math.PI / 180;

  /* interpolación cíclica suave (Catmull-Rom) entre las 8 posiciones clave */
  function cyc(table, p) {
    var n = table.length;
    var f = ((p / (2 * Math.PI)) % 1 + 1) % 1 * n;
    var i = Math.floor(f), t = f - i;
    var a = table[(i + n - 1) % n], b = table[i % n], c = table[(i + 1) % n], d = table[(i + 2) % n];
    return 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
  }

  function legAngles(g, p) {
    var k = Math.min(1.35, Math.max(0.8, g.thighAmp / 0.65));   // más rápido = zancada más amplia
    var thigh = cyc(RUN_THIGH, p) * k * D2R + g.lean * 0.4;
    var knee  = cyc(RUN_KNEE, p) * (0.85 + 0.15 * k) * D2R;
    return [thigh, thigh - knee];            // la rodilla dobla la pierna hacia atrás
  }

  function armAngles(g, q, side) {
    var d, w;
    if (g.style === "airplane") {            // arms straight out, like f-out
      d = side === 0 ? -1 : 1;
      w = 0.08 * Math.sin(q);
      return [d * (1.45 + w), d * (1.55 + w), d * (1.6 + w)];
    }
    if (g.style === "cheer") {               // arms up and waving, like f-up
      d = side === 0 ? -1 : 1;
      w = 0.3 * Math.sin(q * 0.5 + side * 2);
      return [d * (2.75 + w * 0.4), d * (2.95 + w), d * (3.05 + w * 1.2)];
    }
    /* Brazo contrario a la pierna: adelantado cuando esa pierna apoya delante (q = 0).
       Codo en ~90°: más cerrado al ir adelante y más abierto al ir atrás; la mano sigue al antebrazo. */
    var k = Math.min(1.3, Math.max(0.8, g.armAmp / 0.6));
    var u = (4 + 46 * Math.cos(q)) * k * D2R;                        // brazo superior
    var e = (88 - 14 * Math.cos(q)) * D2R;                           // flexión del codo
    return [u, u + e, u + e + 12 * D2R];
  }

  /* Puntos de la cabeza y el cuerpo (para saber qué toca el suelo cuando está tumbado). */
  var BODY_SAMPLES = [[0, 0], [0, 20], [5, 10], [-5, 10], [0, 25], [11, 50], [14, 70],
                      [0, 85], [-14, 70], [-11, 50]];

  /* `ov` (opcional) fuerza la pose: { L, legs:[[muslo,pierna],[..]], arms:[[3],[3]] }.
     Se usa para la caída; sin `ov` se calcula el ciclo normal de carrera. */
  function drawFigure(cx, groundY, g, phase, ov) {
    var s = FIG_H / UNITS_H;
    var L = ov ? ov.L : g.lean;
    var cosL = Math.cos(L), sinL = Math.sin(L);

    /* legs first, to know how far the body must drop to touch the ground */
    var legs = [], lowest = -1e9;
    for (var k = 0; k < 2; k++) {
      var dx = k === 0 ? 6 : -6, dy = 90 - HIP_Y;
      var hx = dx * cosL - dy * sinL, hy = HIP_Y + dx * sinL + dy * cosL;
      var pts = chain(hx, hy, LEG, ov ? ov.legs[k] : legAngles(g, phase + k * Math.PI));
      legs.push(pts);
      lowest = Math.max(lowest, pts[2][1]);
    }
    var arms = [];
    for (var a = 0; a < 2; a++) {
      var sdx = a === 0 ? -14 : 14, sdy = 32 - HIP_Y;
      var sx = sdx * cosL - sdy * sinL, sy = HIP_Y + sdx * sinL + sdy * cosL;
      arms.push(chain(sx, sy, ARM, ov ? ov.arms[a] : armAngles(g, phase + (a === 0 ? 0 : Math.PI), a)));
    }
    var lift = 0;
    if (ov) {
      /* tumbado: lo más bajo puede ser el cuerpo, la cabeza o las manos, no solo los pies */
      for (var i = 0; i < 2; i++) {
        for (var m = 0; m < legs[i].length; m++) lowest = Math.max(lowest, legs[i][m][1]);
        for (var n = 0; n < arms[i].length; n++) lowest = Math.max(lowest, arms[i][n][1]);
      }
      for (var b = 0; b < BODY_SAMPLES.length; b++) {
        var by = BODY_SAMPLES[b][1] - HIP_Y;
        lowest = Math.max(lowest, HIP_Y + BODY_SAMPLES[b][0] * sinL + by * cosL - 1.8);
      }
    } else {
      /* rebote: el cuerpo sube en el vuelo (justo antes de cada apoyo) y baja en el apoyo medio */
      lift = g.bounce * (0.5 - 0.5 * Math.cos(2 * phase - 2.52));
    }
    var shift = (FOOT_Y - lowest) - lift;                 // design units, + = down

    function X(x) { return cx + x * s; }
    function Y(y) { return groundY + (y + shift - FOOT_Y) * s; }

    function stroke(pts) {
      ctx.beginPath();
      ctx.moveTo(X(pts[0][0]), Y(pts[0][1]));
      for (var i = 1; i < pts.length; i++) ctx.lineTo(X(pts[i][0]), Y(pts[i][1]));
      ctx.stroke();
    }

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = COLOR;
    ctx.fillStyle = COLOR;
    ctx.lineWidth = 3.6 * s;

    /* head + body, rotated around the hip */
    ctx.save();
    ctx.translate(X(0), Y(HIP_Y));
    ctx.rotate(L);
    ctx.scale(s, s);
    ctx.translate(0, -HIP_Y);
    ctx.beginPath();
    ctx.ellipse(0, 10, 5, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fill(BODY);
    ctx.restore();

    /* arms: shoulders at (±14, 32); each arm swings opposite to the leg on its side */
    stroke(arms[0]);
    stroke(arms[1]);
    stroke(legs[0]);
    stroke(legs[1]);
  }

  /* ── Tropiezo: un corredor se cae a mitad de camino, se levanta y sigue ─────
     Ángulos como en el ciclo de carrera: desde "recto abajo", adelante (+) positivo. */
  var TRIP_T1 = 380, TRIP_T2 = 420, TRIP_T3 = 800, TRIP_T4 = 1000;   // ms: tropieza, cae, tumbado, se levanta
  var TRIP_TOTAL = TRIP_T1 + TRIP_T2 + TRIP_T3 + TRIP_T4;
  var P_STUMBLE = { L: 0.8,  legs: [[0.35, 0.0], [-0.9, -1.7]],   arms: [[2.3, 2.5, 2.6], [2.1, 2.4, 2.5]] };
  var P_PRONE   = { L: 1.45, legs: [[-1.3, -1.5], [-1.45, -1.2]], arms: [[1.7, 1.6, 1.5], [1.6, 1.5, 1.4]] };
  var P_PUSH    = { L: 1.0,  legs: [[-0.5, -1.6], [-0.8, -1.9]],  arms: [[0.55, 0.35, 0.2], [0.45, 0.3, 0.15]] };
  var P_CROUCH  = { L: 0.45, legs: [[0.9, -0.1], [-0.3, -0.4]],   arms: [[-0.3, 0.3, 0.6], [0.1, 0.5, 0.8]] };

  function lerp(a, b, u) { return a + (b - a) * u; }
  function lerpArr(a, b, u) { return a.map(function (v, i) { return lerp(v, b[i], u); }); }
  function smooth(u) { u = Math.min(1, Math.max(0, u)); return u * u * (3 - 2 * u); }
  function mixPose(a, b, u) {
    return {
      L: lerp(a.L, b.L, u),
      legs: [lerpArr(a.legs[0], b.legs[0], u), lerpArr(a.legs[1], b.legs[1], u)],
      arms: [lerpArr(a.arms[0], b.arms[0], u), lerpArr(a.arms[1], b.arms[1], u)]
    };
  }
  function runPose(g, phase) {
    return {
      L: g.lean,
      legs: [legAngles(g, phase), legAngles(g, phase + Math.PI)],
      arms: [armAngles(g, phase, 0), armAngles(g, phase + Math.PI, 1)]
    };
  }
  function clonePose(p) {
    return { L: p.L, legs: p.legs.map(function (x) { return x.slice(); }), arms: p.arms.map(function (x) { return x.slice(); }) };
  }

  /* k: ms desde que empezó el tropiezo; phase: fase de la zancada en ese momento */
  function tripPose(g, k, phase) {
    var run0 = runPose(g, phase), u, p;
    if (k < TRIP_T1) {                                       // tropieza: se inclina y lanza los brazos
      p = mixPose(run0, P_STUMBLE, smooth(k / TRIP_T1));
      p.arms[0][1] += 0.18 * Math.sin(k / 38);
      p.arms[1][1] -= 0.18 * Math.sin(k / 38);
      return p;
    }
    k -= TRIP_T1;
    if (k < TRIP_T2) {                                       // cae hacia delante, acelerando
      u = k / TRIP_T2;
      return mixPose(P_STUMBLE, P_PRONE, u * u);
    }
    k -= TRIP_T2;
    if (k < TRIP_T3) {                                       // tumbado, aturdido
      u = k / TRIP_T3;
      p = clonePose(P_PRONE);
      p.L += 0.02 * Math.sin(u * 14);
      p.arms[0][1] += 0.25 * Math.sin(u * 9);
      p.legs[0][1] += 0.12 * Math.sin(u * 16);
      return p;
    }
    k -= TRIP_T3;
    u = k / TRIP_T4;                                         // se levanta y retoma la carrera
    if (u < 0.45) return mixPose(P_PRONE, P_PUSH, smooth(u / 0.45));
    if (u < 0.8)  return mixPose(P_PUSH, P_CROUCH, smooth((u - 0.45) / 0.35));
    return mixPose(P_CROUCH, run0, smooth((u - 0.8) / 0.2));
  }

  /* ── Runner personalities ────────────────────────────────────────────────── */
  function rand(a, b) { return a + Math.random() * (b - a); }

  function makeRunner(style, dist) {
    var time  = rand(MIN_TIME, MAX_TIME);
    var speed = dist / (time / 1000);                          // px / s
    var fast  = 1 - (time - MIN_TIME) / (MAX_TIME - MIN_TIME); // 0 slow … 1 fast
    var g = {
      style:    style,
      time:     time,
      delay:    rand(0, 250),
      cps:      Math.max(1.8, Math.min(5.2, speed / 70)) * rand(0.9, 1.1), // stride cycles / s
      phase0:   rand(0, Math.PI * 2),
      lean:     0.06 + 0.2 * fast + rand(-0.03, 0.03),
      thighAmp: rand(0.5, 0.72) + 0.25 * fast,
      kneeMin:  rand(0.1, 0.25),
      kneeMax:  rand(0.9, 1.25) + 0.3 * fast,
      armAmp:   rand(0.5, 0.8) + 0.2 * fast,
      elbow:    rand(1.1, 1.6),
      bounce:   rand(2, 5) + 3 * fast,
      surge:    rand(0.005, 0.015),
      surgePh:  rand(0, 6)
    };
    if (style === "sprinter") {
      g.lean += 0.12; g.kneeMax += 0.3; g.thighAmp += 0.15; g.bounce += 2;
    }
    return g;
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  var racing = false;
  function race() {
    if (racing || document.hidden) return;
    resize();
    if (W < 200) return;
    racing = true;

    var from = -40, to = W + 40, dist = to - from;
    var styles = ["airplane", "cheer", "sprinter"];
    while (styles.length < RUNNERS) styles.push("run");
    shuffle(styles);
    var runners = styles.map(function (st) { return makeRunner(st, dist); });

    /* Uno de los corredores "normales" tropieza a mitad de camino, se cae, se levanta y sigue. */
    var plain = runners.filter(function (r) { return r.style === "run"; });
    if (plain.length) {
      var tripper = plain[Math.floor(Math.random() * plain.length)];
      var tripSpeed = dist / (tripper.time / 1000);              // px / s
      /* Sale 1 s después del último de los demás, para que su caída junto al logo se vea sola. */
      var lastOther = 0;
      runners.forEach(function (r) { if (r !== tripper) lastOther = Math.max(lastOther, r.delay); });
      tripper.delay = lastOther + 1000;
      tripper.trip = {
        at:    tripFraction(),                                   // fracción de su carrera: justo tras cruzar el logo
        total: TRIP_TOTAL,
        slide: Math.min(80, tripSpeed * 0.4)                     // px que se desliza hacia delante al caer
      };
    }

    /* El logo UOMI de la barra: el corredor tropieza unos px después de su borde derecho. */
    function tripFraction() {
      var logo = document.querySelector(".topbar .brand img") || document.querySelector(".topbar .brand");
      var barLeft = topbar.getBoundingClientRect().left;
      var logoRight = logo ? logo.getBoundingClientRect().right - barLeft : 120;
      var x = logoRight + 46;                                      // un par de zancadas más allá del logo
      return Math.min(0.5, Math.max(0.02, (x - from) / dist));
    }

    var start = null;
    function frame(now) {
      if (start === null) start = now;
      var elapsed = now - start, pending = 0;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, W, H);
      var groundY = H - 4;
      runners.forEach(function (r) {
        var local = elapsed - r.delay;
        var span = r.time + (r.trip ? r.trip.total : 0);          // la caída alarga su carrera
        var t = Math.min(Math.max(local / span, 0), 1);
        if (t >= 1) return;
        pending++;
        if (t <= 0) return;

        /* tiempo "corriendo": se congela mientras está tropezando/caído */
        var runLocal = local, tk = -1, xOff = 0, tripStart = 0;
        if (r.trip) {
          tripStart = r.trip.at * r.time;
          tk = local - tripStart;
          if (tk > 0) {
            runLocal = tk < r.trip.total ? tripStart : local - r.trip.total;
            var su = Math.min(1, tk / 900);
            xOff = r.trip.slide * (1 - (1 - su) * (1 - su));        // se desliza y frena
          }
        }
        var tRun = Math.min(Math.max(runLocal / r.time, 0), 1);
        /* a little surge/lag so they don't all move at a constant speed */
        var prog = tRun + r.surge * Math.sin(6 * Math.PI * tRun + r.surgePh)
                        - r.surge * Math.sin(r.surgePh) * (1 - tRun);
        var x = Math.round((from + dist * prog + xOff) * DPR) / DPR;   // whole device pixels
        var phase = r.phase0 + 2 * Math.PI * r.cps * (runLocal / 1000);
        if (r.trip && tk > 0 && tk < r.trip.total) {
          drawFigure(x, groundY, r, phase, tripPose(r, tk, phase));
        } else {
          drawFigure(x, groundY, r, phase);
        }
      });
      if (pending) {
        window.requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, W, H);
        racing = false;
      }
    }
    window.requestAnimationFrame(frame);
  }

  window.setTimeout(function () {
    race();
    window.setInterval(race, RACE_EVERY);
  }, FIRST_RACE);
})();
