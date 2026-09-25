"use client";

import { Component, Suspense, lazy, useEffect, useRef, useState, useTransition, type ReactNode } from "react";

import type { Locale } from "@/i18n/locales";

import { getWidgetCopy, type WidgetCopy } from "./error-propagation-copy";

/**
 * 같은 throw 를 자리만 바꿔 가며 던져 보고, 그것이 ErrorBoundary 에 닿는지
 * 아니면 경계를 지나쳐 전역 핸들러로 가는지를 눈으로 확인하는 위젯.
 *
 * 마크다운에서 :::widget-error-propagation 으로 삽입한다.
 *
 * 경계가 잡지 못한 것을 "아무 일도 안 일어난다"로 두면 독자가 확인할 방법이 없다.
 * 그래서 위젯이 살아 있는 동안 window 의 error 와 unhandledrejection 을 듣고,
 * 방금 던진 것이 거기로 갔다는 사실을 화면에 적는다.
 */

type SiteId = "render" | "effect" | "event" | "timeout" | "promise" | "transition" | "lazy";

type Site = {
  id: SiteId;
  code: string;
  expected: "boundary" | "window" | "rejection";
};

const SITES: Site[] = [
  { id: "render", code: "function Child() {\n  throw new Error('boom')\n}", expected: "boundary" },
  { id: "effect", code: "useEffect(() => {\n  throw new Error('boom')\n}, [])", expected: "boundary" },
  { id: "transition", code: "startTransition(() => {\n  throw new Error('boom')\n})", expected: "boundary" },
  { id: "lazy", code: "lazy(() => Promise.reject(\n  new Error('boom')\n))", expected: "boundary" },
  { id: "event", code: "<button onClick={() => {\n  throw new Error('boom')\n}}>", expected: "window" },
  { id: "timeout", code: "setTimeout(() => {\n  throw new Error('boom')\n}, 0)", expected: "window" },
  { id: "promise", code: "Promise.reject(\n  new Error('boom')\n)", expected: "rejection" },
];

function landingLabel(expected: Site["expected"], copy: WidgetCopy): string {
  if (expected === "boundary") return "ErrorBoundary";
  return expected === "window" ? copy.landing.window : copy.landing.rejection;
}

// lazy() 는 모듈 최상위에서 한 번만 부른다. 렌더마다 새로 만들면 매번 새 payload 가
// 생겨서, 거부를 기억한다는 lazy 의 실제 동작이 위젯에서 드러나지 않는다.
// 그래서 두 번째부터는 요청 없이 곧바로 같은 에러가 다시 던져진다.
const Late = lazy(() => Promise.reject(new Error("boom")) as Promise<{ default: React.ComponentType }>);

class Boundary extends Component<{ children: ReactNode; onCatch: () => void; label: string }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onCatch();
  }

  render() {
    if (this.state.failed) {
      return <p className="epp-fallback">{this.props.label}</p>;
    }
    return this.props.children;
  }
}

function Thrower({ site, onEvent, copy }: { site: SiteId | null; onEvent: (id: SiteId) => void; copy: WidgetCopy }) {
  const [, startTransition] = useTransition();
  const [bump, setBump] = useState(0);

  if (site === "render") throw new Error("boom");

  useEffect(() => {
    if (site === "effect") throw new Error("boom");
  }, [site]);

  useEffect(() => {
    if (site === "timeout") setTimeout(() => { throw new Error("boom"); }, 0);
    if (site === "promise") void Promise.reject(new Error("boom"));
    if (site === "transition") startTransition(() => { setBump((n) => n + 1); throw new Error("boom"); });
  }, [site, startTransition]);

  if (site === "lazy") {
    return (
      <Suspense fallback={<p className="epp-idle">{copy.loadingCode}</p>}>
        <Late />
      </Suspense>
    );
  }

  if (site === "event") {
    return (
      <button type="button" className="epp-inner-button" onClick={() => { onEvent("event"); throw new Error("boom"); }}>
        {copy.eventButton}
      </button>
    );
  }

  return <p className="epp-idle">{copy.intact}{bump ? ` (${bump})` : ""}</p>;
}

export default function ErrorPropagationPlayground({ locale }: { locale: Locale }) {
  const copy = getWidgetCopy(locale);
  const [site, setSite] = useState<SiteId | null>(null);
  const [runId, setRunId] = useState(0);
  const [landed, setLanded] = useState<Site["expected"] | null>(null);
  const armed = useRef(false);

  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      if (!armed.current || e.message?.indexOf("boom") === -1) return;
      e.preventDefault();
      setLanded("window");
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      if (!armed.current || String(e.reason?.message) !== "boom") return;
      e.preventDefault();
      setLanded("rejection");
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  const run = (id: SiteId) => {
    armed.current = true;
    setLanded(null);
    setSite(id);
    setRunId((n) => n + 1);
  };

  const reset = () => {
    armed.current = false;
    setLanded(null);
    setSite(null);
    setRunId((n) => n + 1);
  };

  const current = SITES.find((s) => s.id === site) ?? null;
  const waitingForClick = site === "event" && landed === null;

  return (
    <div className="epp">
      <div className="epp-sites">
        {SITES.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`epp-site${s.id === site ? " is-active" : ""}`}
            onClick={() => run(s.id)}
          >
            {copy.sites[s.id]}
          </button>
        ))}
        <button type="button" className="epp-site epp-reset" onClick={reset}>
          {copy.reset}
        </button>
      </div>

      <div className="epp-stage">
        <p className="epp-stage-label">ErrorBoundary</p>
        <div className="epp-box">
          <Boundary key={runId} label={copy.caught} onCatch={() => setLanded("boundary")}>
            <Thrower site={site} copy={copy} onEvent={() => { armed.current = true; }} />
          </Boundary>
        </div>
      </div>

      <div className="epp-readout">
        {current === null && (
          <p className="epp-idle">
            {copy.pickBefore}
            <code>new Error(&apos;boom&apos;)</code>
            {copy.pickAfter}
          </p>
        )}
        {current !== null && (
          <>
            <pre className="epp-code">{current.code}</pre>
            {waitingForClick && <p className="epp-idle">{copy.needClick}</p>}
            {landed !== null && (
              <p className={landed === "boundary" ? "epp-hit" : "epp-miss"}>
                {landed === "boundary" ? copy.hit : copy.miss}
                {copy.landedPrefix}
                <code>{landingLabel(landed, copy)}</code>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
