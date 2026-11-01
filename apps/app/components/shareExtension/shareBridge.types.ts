/**
 * 공유 화면 루트 컴포넌트가 플랫폼별로 받는 초기 props의 합집합.
 * @description iOS는 expo-share-extension의 `InitialProps`(url/text)를, Android는
 * ShareActivity가 넘기는 SEND 인텐트 값(text/subject)을 그대로 이 모양으로 받는다.
 */
export interface IFShareExtensionProps {
	url?: string;
	text?: string;
	subject?: string;
}
