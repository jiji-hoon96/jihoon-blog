import type { Locale } from "@/i18n/locales";

/**
 * ErrorPropagationPlayground 의 화면 문구.
 *
 * `src/i18n/dictionaries.ts` 에 넣지 않는다. 그 파일은 Header 와 Footer 가
 * import 하므로 모든 페이지의 클라이언트 번들에 실린다. 이 위젯은 글 한 편
 * (251117) 만 쓰고 `InteractiveWidgets` 가 동적 import 로 받으므로, 문구도
 * 같은 청크에 있어야 다른 글이 6개 로케일 문구를 내려받지 않는다.
 *
 * 코드 스니펫(`Site.code`)과 `ErrorBoundary`, `window` 같은 식별자는 번역하지
 * 않는다. 던질 자리의 이름도 `useEffect 안` 처럼 API 이름을 그대로 둔다.
 */
export type WidgetCopy = {
  sites: {
    render: string;
    effect: string;
    transition: string;
    lazy: string;
    event: string;
    timeout: string;
    promise: string;
  };
  landing: { window: string; rejection: string };
  reset: string;
  caught: string;
  loadingCode: string;
  eventButton: string;
  intact: string;
  pickBefore: string;
  pickAfter: string;
  needClick: string;
  hit: string;
  miss: string;
  landedPrefix: string;
};

const COPY: Record<Locale, WidgetCopy> = {
  ko: {
    sites: {
      render: "렌더 중",
      effect: "useEffect 안",
      transition: "startTransition 안",
      lazy: "lazy 의 import 거부",
      event: "onClick 핸들러 안",
      timeout: "setTimeout 콜백 안",
      promise: "처리하지 않은 거부",
    },
    landing: { window: "window 의 error", rejection: "window 의 unhandledrejection" },
    reset: "처음으로",
    caught: "경계가 받았다. fallback 을 그린다",
    loadingCode: "코드를 받는 중",
    eventButton: "이 버튼을 눌러 핸들러 안에서 던진다",
    intact: "경계 안의 화면이다. 아직 멀쩡하다",
    pickBefore: "위에서 던질 자리를 고른다. 어디서 던지든 ",
    pickAfter: " 하나다.",
    needClick: "경계 안의 버튼을 눌러야 던져진다.",
    hit: "경계가 받았다",
    miss: "경계를 지나쳤다",
    landedPrefix: " · 도착지 ",
  },
  en: {
    sites: {
      render: "during render",
      effect: "inside useEffect",
      transition: "inside startTransition",
      lazy: "a rejected lazy import",
      event: "inside an onClick handler",
      timeout: "inside a setTimeout callback",
      promise: "an unhandled rejection",
    },
    landing: { window: "the error event on window", rejection: "unhandledrejection on window" },
    reset: "Start over",
    caught: "The boundary caught it and drew the fallback",
    loadingCode: "Fetching the code",
    eventButton: "Press this to throw inside the handler",
    intact: "This is the screen inside the boundary. Still fine",
    pickBefore: "Pick a place to throw from above. Wherever it is, it is the same ",
    pickAfter: ".",
    needClick: "You have to press the button inside the boundary to throw.",
    hit: "The boundary caught it",
    miss: "It passed the boundary by",
    landedPrefix: " · landed in ",
  },
  ja: {
    sites: {
      render: "レンダー中",
      effect: "useEffect の中",
      transition: "startTransition の中",
      lazy: "lazy の import 拒否",
      event: "onClick ハンドラーの中",
      timeout: "setTimeout コールバックの中",
      promise: "処理されていない拒否",
    },
    landing: { window: "window の error", rejection: "window の unhandledrejection" },
    reset: "最初に戻る",
    caught: "境界が受け取った。fallback を描く",
    loadingCode: "コードを受け取り中",
    eventButton: "このボタンを押してハンドラーの中で投げる",
    intact: "境界の中の画面だ。まだ無事だ",
    pickBefore: "上から投げる場所を選ぶ。どこで投げても ",
    pickAfter: " ひとつだ。",
    needClick: "境界の中のボタンを押さないと投げられない。",
    hit: "境界が受け取った",
    miss: "境界を通り過ぎた",
    landedPrefix: " · 到着地 ",
  },
  es: {
    sites: {
      render: "durante el render",
      effect: "dentro de useEffect",
      transition: "dentro de startTransition",
      lazy: "un import de lazy rechazado",
      event: "dentro de un handler onClick",
      timeout: "dentro de un callback de setTimeout",
      promise: "un rechazo sin manejar",
    },
    landing: { window: "el evento error de window", rejection: "unhandledrejection de window" },
    reset: "Empezar de nuevo",
    caught: "El límite lo atrapó y dibuja el fallback",
    loadingCode: "Descargando el código",
    eventButton: "Pulsa esto para lanzar dentro del handler",
    intact: "Esta es la pantalla dentro del límite. Sigue intacta",
    pickBefore: "Elige arriba desde dónde lanzar. Sea donde sea, es el mismo ",
    pickAfter: ".",
    needClick: "Hay que pulsar el botón de dentro del límite para que se lance.",
    hit: "El límite lo atrapó",
    miss: "Pasó de largo el límite",
    landedPrefix: " · destino ",
  },
  "pt-BR": {
    sites: {
      render: "durante o render",
      effect: "dentro de useEffect",
      transition: "dentro de startTransition",
      lazy: "um import de lazy rejeitado",
      event: "dentro de um handler onClick",
      timeout: "dentro de um callback de setTimeout",
      promise: "uma rejeição não tratada",
    },
    landing: { window: "o evento error do window", rejection: "unhandledrejection do window" },
    reset: "Começar de novo",
    caught: "O limite capturou e desenha o fallback",
    loadingCode: "Baixando o código",
    eventButton: "Aperte aqui para lançar dentro do handler",
    intact: "Esta é a tela dentro do limite. Ainda inteira",
    pickBefore: "Escolha acima de onde lançar. Seja onde for, é o mesmo ",
    pickAfter: ".",
    needClick: "É preciso apertar o botão dentro do limite para lançar.",
    hit: "O limite capturou",
    miss: "Passou pelo limite",
    landedPrefix: " · destino ",
  },
  "zh-CN": {
    sites: {
      render: "渲染过程中",
      effect: "useEffect 里",
      transition: "startTransition 里",
      lazy: "lazy 的 import 被拒绝",
      event: "onClick 处理函数里",
      timeout: "setTimeout 回调里",
      promise: "未处理的拒绝",
    },
    landing: { window: "window 的 error", rejection: "window 的 unhandledrejection" },
    reset: "回到开头",
    caught: "边界接住了，画出 fallback",
    loadingCode: "正在取代码",
    eventButton: "按这个按钮，在处理函数里抛出",
    intact: "这是边界里面的画面，还好好的",
    pickBefore: "在上面挑一个抛出的位置。不管在哪里抛，都是同一个 ",
    pickAfter: "。",
    needClick: "要按边界里面的按钮才会抛出。",
    hit: "边界接住了",
    miss: "从边界旁边过去了",
    landedPrefix: " · 落点 ",
  },
};

export function getWidgetCopy(locale: Locale): WidgetCopy {
  return COPY[locale];
}
