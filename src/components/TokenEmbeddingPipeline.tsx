"use client";

import { useEffect, useRef } from "react";

/**
 * 토큰 → 토큰 ID → 임베딩 벡터 → 위치 인코딩 4단계 파이프라인을
 * 사용자가 직접 입력 문장과 표시 차원을 바꿔가며 추적해볼 수 있는 인터랙티브 위젯.
 *
 * 마크다운에서 :::widget{name=token-pipeline} 으로 삽입하면,
 * remark-widget 플러그인이 만든 placeholder(div.interactive-widget[data-widget=token-pipeline])를
 * InteractiveWidgets가 찾아 이 컴포넌트로 채운다.
 */
export default function TokenEmbeddingPipeline() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    type Input = { label: string; tokens: string[]; ids: number[] };

    const INPUTS: Input[] = [
      { label: "나는 너를 좋아해", tokens: ["나는", " 너를", " 좋아해"], ids: [4312, 2918, 7741] },
      { label: "the cat sat", tokens: ["the", " cat", " sat"], ids: [1234, 3729, 8821] },
      { label: "Hello world", tokens: ["Hello", " world"], ids: [9906, 1917] },
    ];

    const COLORS = [
      { chip: "background:#D4E8FF;color:#0C447C", id: "background:#B5D4F4;color:#0C447C" },
      { chip: "background:#E8D6FF;color:#3C3489", id: "background:#CECBF6;color:#3C3489" },
      { chip: "background:#FFE4D8;color:#993C1D", id: "background:#F5C4B3;color:#993C1D" },
      { chip: "background:#D6F0E6;color:#085041", id: "background:#9FE1CB;color:#085041" },
    ];

    let currentInput = 0;
    let currentDim = 6;
    let selectedTok: number | null = null;

    const seededRand = (seed: number) => {
      let s = seed;
      return () => {
        s = (s * 16807 + 0) % 2147483647;
        return (s - 1) / 2147483646;
      };
    };
    const embVal = (tokIdx: number, dim: number, d: number) => {
      const r = seededRand(tokIdx * 137 + dim * 31 + d * 17);
      return +(r() * 4 - 2).toFixed(2);
    };
    const posVal = (pos: number, dim: number, d: number) => {
      const r = seededRand(pos * 53 + dim * 19 + d * 7);
      return +(r() * 1.4 - 0.7).toFixed(2);
    };
    const valColor = (v: number, alpha?: number) => {
      if (v > 0.8) return `background:rgba(13,92,184,${alpha || 0.18});color:#0C447C`;
      if (v < -0.8) return `background:rgba(216,90,48,${alpha || 0.18});color:#993C1D`;
      return `background:var(--color-background-secondary, #f3f4f6);color:var(--color-text-secondary, #4b5563)`;
    };

    root.innerHTML = `
      <div class="tep-root" style="padding:0.5rem 0 1rem;">
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px; align-items:center;">
          <span style="font-size:13px; color:var(--color-text-secondary,#4b5563);">입력 문장:</span>
          <button data-input="0" class="tep-inbtn">나는 너를 좋아해</button>
          <button data-input="1" class="tep-inbtn">the cat sat</button>
          <button data-input="2" class="tep-inbtn">Hello world</button>
        </div>
        <div class="tep-dim-row" style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
          <span style="font-size:12px; color:var(--color-text-secondary,#4b5563); white-space:nowrap;">표시 차원 수:</span>
          <input type="range" min="4" max="8" value="6" class="tep-dim" step="1" style="flex:1; max-width:120px;">
          <span class="tep-dim-note tep-dim-label">d=6</span>
          <span class="tep-dim-note" style="color:var(--color-text-tertiary,#9ca3af);">(실제 GPT-4: d=12,288)</span>
        </div>

        <div class="tep-stage">
          <div class="tep-stage-label">① 텍스트 → 토큰 (BPE 토크나이저)</div>
          <div class="tep-tok-row" style="display:flex; gap:6px; flex-wrap:wrap;"></div>
        </div>
        <div class="tep-arrow"><span>각 토큰을 어휘 사전에서 찾아</span><span>↓</span></div>

        <div class="tep-stage">
          <div class="tep-stage-label">② 토큰 → 토큰 ID (어휘 사전 조회)</div>
          <div class="tep-id-row" style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;"></div>
          <div class="tep-hint tep-vocab-note" style="margin-top:8px;"></div>
        </div>
        <div class="tep-arrow"><span>임베딩 행렬의 해당 행을 꺼내면</span><span>↓</span></div>

        <div class="tep-stage">
          <div class="tep-stage-label">③ 토큰 ID → 임베딩 벡터 (의미 좌표)</div>
          <div class="tep-emb-section"></div>
          <div class="tep-hint tep-emb-note" style="margin-top:8px;"></div>
        </div>
        <div class="tep-arrow"><span>각 위치 벡터를 더하면</span><span>↓</span></div>

        <div class="tep-stage">
          <div class="tep-stage-label">④ 위치 인코딩 더하기 (순서 정보 주입)</div>
          <div class="tep-pos-section"></div>
          <div class="tep-hint">같은 토큰도 위치가 다르면 최종 벡터가 달라집니다. 셀프 어텐션은 이 벡터로 순서를 인식합니다.</div>
        </div>

        <div class="tep-summary"></div>
      </div>
    `;

    const $ = <T extends Element>(sel: string) => root.querySelector(sel) as T;
    const $$ = (sel: string) => Array.from(root.querySelectorAll(sel));

    const tokRow = $<HTMLDivElement>(".tep-tok-row");
    const idRow = $<HTMLDivElement>(".tep-id-row");
    const embSection = $<HTMLDivElement>(".tep-emb-section");
    const posSection = $<HTMLDivElement>(".tep-pos-section");
    const embNote = $<HTMLDivElement>(".tep-emb-note");
    const summaryNote = $<HTMLDivElement>(".tep-summary");
    const dimLabel = $<HTMLSpanElement>(".tep-dim-label");

    function render() {
      const inp = INPUTS[currentInput];
      const d = currentDim;
      const showAll = selectedTok === null;

      // Stage 1
      tokRow.innerHTML = "";
      inp.tokens.forEach((t, i) => {
        const c = COLORS[i % COLORS.length];
        const active = selectedTok === i ? " tep-active" : "";
        const chip = document.createElement("span");
        chip.className = "tep-chip" + active;
        chip.style.cssText = c.chip;
        chip.title = `위치 ${i}`;
        chip.textContent = t;
        chip.onclick = () => {
          selectedTok = selectedTok === i ? null : i;
          render();
        };
        tokRow.appendChild(chip);
        if (i < inp.tokens.length - 1) {
          const plus = document.createElement("span");
          plus.style.cssText = "font-size:11px;color:var(--color-text-tertiary,#9ca3af);align-self:center;";
          plus.textContent = "+";
          tokRow.appendChild(plus);
        }
      });

      // Stage 2
      idRow.innerHTML = "";
      inp.tokens.forEach((t, i) => {
        if (!showAll && selectedTok !== i) return;
        const c = COLORS[i % COLORS.length];
        const wrap = document.createElement("div");
        wrap.style.cssText = "display:flex;align-items:center;gap:6px;";
        wrap.innerHTML = `<span class="tep-chip" style="${c.chip};cursor:default;">${t}</span>
          <span style="font-size:11px;color:var(--color-text-tertiary,#9ca3af);">→</span>
          <span class="tep-id-pill" style="${c.id};">ID ${inp.ids[i]}</span>`;
        idRow.appendChild(wrap);
      });

      // Stage 3
      embSection.innerHTML = "";
      const embTokens = showAll ? inp.tokens.map((_, i) => i) : [selectedTok as number];
      embTokens.forEach((i) => {
        const c = COLORS[i % COLORS.length];
        const row = document.createElement("div");
        row.style.cssText = "margin-bottom:8px;";
        const vals = Array.from({ length: d }, (_, dim) => embVal(i, dim, currentDim));
        const cells = vals
          .map((v, dim) => `<div class="tep-cell" style="${valColor(v, 0.22)}" title="dim ${dim}: ${v}">${v > 0 ? "+" : ""}${v}</div>`)
          .join("");
        row.innerHTML = `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
            <span class="tep-id-pill" style="${c.id};cursor:default;">ID ${inp.ids[i]}</span>
            <span style="font-size:11px;color:var(--color-text-tertiary,#9ca3af);">행 →</span>
            <span style="font-size:11px;color:var(--color-text-secondary,#4b5563);">${inp.tokens[i]}</span>
          </div>
          <div class="tep-vec">${cells}<span style="font-size:12px;color:var(--color-text-tertiary,#9ca3af);margin-left:4px;">… (d=${d})</span></div>`;
        embSection.appendChild(row);
      });
      embNote.textContent = `임베딩 행렬 크기: 어휘 크기 × d_model ≈ 50,000 × ${d === 6 ? "4,096 (실제)" : d} → 학습으로 결정됨`;

      // Stage 4
      posSection.innerHTML = "";
      const posTokens = showAll ? inp.tokens.map((_, i) => i) : [selectedTok as number];
      posTokens.forEach((i) => {
        const c = COLORS[i % COLORS.length];
        const embVals = Array.from({ length: d }, (_, dim) => embVal(i, dim, currentDim));
        const posVals = Array.from({ length: d }, (_, dim) => posVal(i, dim, currentDim));
        const sumVals = embVals.map((e, dim) => +(e + posVals[dim]).toFixed(2));
        const embCells = embVals.map((v, dim) => `<div class="tep-cell" style="${valColor(v, 0.18)}" title="emb dim${dim}">${v > 0 ? "+" : ""}${v}</div>`).join("");
        const posCells = posVals.map((v, dim) => `<div class="tep-cell" style="${valColor(v, 0.13)}" title="pos dim${dim}">${v > 0 ? "+" : ""}${v}</div>`).join("");
        const sumCells = sumVals.map((v, dim) => `<div class="tep-cell" style="${valColor(v, 0.28)};font-weight:500;" title="sum dim${dim}">${v > 0 ? "+" : ""}${v}</div>`).join("");
        const row = document.createElement("div");
        row.style.cssText = "margin-bottom:12px;";
        row.innerHTML = `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
            <span class="tep-chip" style="${c.chip};cursor:default;">위치 ${i}</span>
            <span style="font-size:11px;color:var(--color-text-secondary,#4b5563);">${inp.tokens[i]}</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            <div><div class="tep-vlabel">임베딩</div><div class="tep-vec">${embCells}</div></div>
            <span style="font-size:16px;color:var(--color-text-tertiary,#9ca3af);align-self:flex-end;padding-bottom:2px;">+</span>
            <div><div class="tep-vlabel">위치 인코딩</div><div class="tep-vec">${posCells}</div></div>
            <span style="font-size:16px;color:var(--color-text-tertiary,#9ca3af);align-self:flex-end;padding-bottom:2px;">=</span>
            <div><div class="tep-vlabel" style="font-weight:500;">최종 입력 벡터 ✓</div><div class="tep-vec">${sumCells}</div></div>
          </div>`;
        posSection.appendChild(row);
      });

      // Summary
      const names = inp.tokens.join(", ");
      summaryNote.innerHTML = `<strong>${inp.tokens.length}개 토큰</strong>(${names})이 각각 ${d}차원 벡터로 변환되어 트랜스포머 레이어에 입력된다. 각 벡터는 의미(임베딩) + 위치(위치 인코딩)를 동시에 담고 있다.`;

      // 입력 버튼 활성 상태
      $$(".tep-inbtn").forEach((b) => {
        const el = b as HTMLButtonElement;
        const active = +el.dataset.input! === currentInput;
        el.classList.toggle("tep-inbtn-active", active);
      });
    }

    // 이벤트 바인딩
    $$(".tep-inbtn").forEach((b) => {
      const el = b as HTMLButtonElement;
      el.onclick = () => {
        currentInput = +el.dataset.input!;
        selectedTok = null;
        render();
      };
    });
    const dimSlider = $<HTMLInputElement>(".tep-dim");
    dimSlider.oninput = () => {
      currentDim = +dimSlider.value;
      dimLabel.textContent = "d=" + currentDim;
      render();
    };

    render();

    return () => {
      if (root) root.innerHTML = "";
    };
  }, []);

  return <div ref={rootRef} className="tep-mount not-prose" />;
}
