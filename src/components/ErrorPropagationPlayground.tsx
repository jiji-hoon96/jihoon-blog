"use client";

import { Component, Suspense, lazy, useEffect, useRef, useState, useTransition, type ReactNode } from "react";

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
  label: string;
  code: string;
  expected: "boundary" | "window" | "rejection";
};

const SITES: Site[] = [
  { id: "render", label: "렌더 중", code: "function Child() {\n  throw new Error('boom')\n}", expected: "boundary" },
  { id: "effect", label: "useEffect 안", code: "useEffect(() => {\n  throw new Error('boom')\n}, [])", expected: "boundary" },
  { id: "transition", label: "startTransition 안", code: "startTransition(() => {\n  throw new Error('boom')\n})", expected: "boundary" },
  { id: "lazy", label: "lazy 의 import 거부", code: "lazy(() => Promise.reject(\n  new Error('boom')\n))", expected: "boundary" },
  { id: "event", label: "onClick 핸들러 안", code: "<button onClick={() => {\n  throw new Error('boom')\n}}>", expected: "window" },
  { id: "timeout", label: "setTimeout 콜백 안", code: "setTimeout(() => {\n  throw new Error('boom')\n}, 0)", expected: "window" },
  { id: "promise", label: "처리하지 않은 거부", code: "Promise.reject(\n  new Error('boom')\n)", expected: "rejection" },
];

const LANDING: Record<Site["expected"], string> = {
  boundary: "ErrorBoundary",
  window: "window 의 error",
  rejection: "window 의 unhandledrejection",
};

// lazy() 는 모듈 최상위에서 한 번만 부른다. 렌더마다 새로 만들면 매번 새 payload 가
// 생겨서, 거부를 기억한다는 lazy 의 실제 동작이 위젯에서 드러나지 않는다.
// 그래서 두 번째부터는 요청 없이 곧바로 같은 에러가 다시 던져진다.
const Late = lazy(() => Promise.reject(new Error("boom")) as Promise<{ default: React.ComponentType }>);

class Boundary extends Component<{ children: ReactNode; onCatch: () => void }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onCatch();
  }

  render() {
    if (this.state.failed) {
      return <p className="epp-fallback">경계가 받았다. fallback 을 그린다</p>;
    }
    return this.props.children;
  }
}

function Thrower({ site, onEvent }: { site: SiteId | null; onEvent: (id: SiteId) => void }) {
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
      <Suspense fallback={<p className="epp-idle">코드를 받는 중</p>}>
        <Late />
      </Suspense>
    );
  }

  if (site === "event") {
    return (
      <button type="button" className="epp-inner-button" onClick={() => { onEvent("event"); throw new Error("boom"); }}>
        이 버튼을 눌러 핸들러 안에서 던진다
      </button>
    );
  }

  return <p className="epp-idle">경계 안의 화면이다. 아직 멀쩡하다{bump ? ` (${bump})` : ""}</p>;
}

export default function ErrorPropagationPlayground() {
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
            {s.label}
          </button>
        ))}
        <button type="button" className="epp-site epp-reset" onClick={reset}>
          처음으로
        </button>
      </div>

      <div className="epp-stage">
        <p className="epp-stage-label">ErrorBoundary</p>
        <div className="epp-box">
          <Boundary key={runId} onCatch={() => setLanded("boundary")}>
            <Thrower site={site} onEvent={() => { armed.current = true; }} />
          </Boundary>
        </div>
      </div>

      <div className="epp-readout">
        {current === null && (
          <p className="epp-idle">
            위에서 던질 자리를 고른다. 어디서 던지든 <code>new Error(&apos;boom&apos;)</code> 하나다.
          </p>
        )}
        {current !== null && (
          <>
            <pre className="epp-code">{current.code}</pre>
            {waitingForClick && <p className="epp-idle">경계 안의 버튼을 눌러야 던져진다.</p>}
            {landed !== null && (
              <p className={landed === "boundary" ? "epp-hit" : "epp-miss"}>
                {landed === "boundary" ? "경계가 받았다" : "경계를 지나쳤다"}
                {" · 도착지 "}
                <code>{LANDING[landed]}</code>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
