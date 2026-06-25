import { visit } from 'unist-util-visit'

/**
 * :::widget-<name> 컨테이너를 인터랙티브 위젯 placeholder로 변환하는 remark 플러그인.
 *
 * 마크다운 문법:
 * :::widget-token-pipeline
 * :::
 *
 * - 디렉티브 이름의 `widget-` 접두사 뒤가 위젯 식별자가 된다. (attribute 미사용 — 현재 마크다운
 *   파이프라인이 attribute 있는 컨테이너 디렉티브에서 깨지는 문제를 피하기 위함)
 * - 본문 HTML에는 빈 <div class="interactive-widget" data-widget="token-pipeline"> 만 남는다.
 * - 실제 위젯 렌더링은 클라이언트 컴포넌트(InteractiveWidgets)가 마운트 후 이 placeholder를 찾아 처리한다.
 * - 따라서 SSR/RSS/검색에는 빈 컨테이너만 들어가고, JS가 켜진 브라우저에서만 인터랙션이 동작한다.
 */
export function remarkWidget() {
  return (tree: any) => {
    visit(tree, (node: any) => {
      if (node.type !== 'containerDirective') return
      if (typeof node.name !== 'string' || !node.name.startsWith('widget-')) return

      const name = node.name.slice('widget-'.length)
      if (!name) return

      const data = node.data || (node.data = {})
      data.hName = 'div'
      data.hProperties = {
        className: ['interactive-widget'],
        'data-widget': name,
      }
    })
  }
}
