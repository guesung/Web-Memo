export interface MarkdownEditorProps {
  /** 초기 마크다운 값 */
  defaultValue?: string;
  /** 마크다운 변경 콜백 */
  onChange?: (markdown: string) => void;
  /** 블러 이벤트 콜백 */
  onBlur?: () => void;
  /** 포커스 이벤트 콜백 */
  onFocus?: () => void;
  /** 플레이스홀더 텍스트 */
  placeholder?: string;
  /** 읽기 전용 모드 */
  readOnly?: boolean;
  /** 추가 클래스 */
  className?: string;
}

export interface MarkdownEditorRef {
  /** 현재 마크다운 콘텐츠 가져오기 */
  getMarkdown: () => string;
  /** 마크다운 콘텐츠 설정 */
  setMarkdown: (markdown: string) => void;
  /** 읽기 전용 모드 설정 */
  setReadOnly: (readOnly: boolean) => void;
}
