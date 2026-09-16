type DataLayerWindow = Window & { dataLayer?: unknown[] }

/**
 * GA4 이벤트를 dataLayer 에 직접 쌓는다.
 *
 * `window.gtag` 이 정의되기를 기다리지 않는다. `onTTFB` 와 `onFCP` 는 콜백을 등록하는
 * 즉시 한 번만 발화하므로, `typeof gtag !== 'function'` 이면 돌아가는 방식은
 * 그 시점에 shim 이 아직 없으면 지표를 영영 잃는다.
 *
 * **실측으로는 그 유실을 재현하지 못했다.** 레이아웃의 인라인 스니펫이
 * `function gtag(){dataLayer.push(arguments)}` 를 hydration 전에 정의해 주기 때문에,
 * 헤드리스 Chrome 으로 gtag.js 를 6초 지연시켜도 옛 코드와 이 코드가 똑같이
 * `web_vitals` 2건을 `tid=G-GSVYLL0LV0` 로 보냈다. 그러니 이것은 측정된 유실을
 * 메운 것이 아니라, 스크립트 로드 순서에 대한 의존 자체를 없앤 것이다.
 *
 * 인라인 스니펫이 `window.dataLayer = window.dataLayer || []` 로 시작하므로
 * 여기서 먼저 만들어 두어도 충돌하지 않는다. gtag.js 는 로드될 때 쌓인 큐를 소비한다.
 * `arguments` 객체를 밀어 넣는 것은 그 스니펫과 같은 모양을 만들기 위해서다.
 * 배열을 넣으면 gtag.js 가 명령으로 읽지 않는다.
 */
export function sendGaEvent(
  name: string,
  parameters: Record<string, unknown>,
): void {
  if (typeof window === 'undefined') return

  const target = window as DataLayerWindow
  const queue = (target.dataLayer ??= [])

  // gtag.js 는 배열이 아니라 arguments 객체를 명령으로 읽으므로 화살표 함수를 쓸 수 없다.
  const push: (...args: unknown[]) => void = function () {
    // eslint-disable-next-line prefer-rest-params
    queue.push(arguments)
  }

  push('event', name, parameters)
}
