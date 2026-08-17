# 버전 관리

이 레포지토리에는 **서로 독립적인 세 개의 버전 트랙**이 있으며, 각 트랙은 그것을
필요로 하는 배포 채널이 소유합니다. 이 버전들은 **의도적으로 서로 동기화하지
않습니다**.

## 세 개의 트랙

| 트랙 | 단일 진실 원천 | 사용하는 곳 | 올리는 시점 |
| --- | --- | --- | --- |
| **확장 프로그램(Extension)** | `apps/chrome-extension/package.json` → `version` | `apps/chrome-extension/manifest.js` | 확장 프로그램을 릴리스할 때 |
| **앱(App)** | `apps/app/app.json` → `version` | App Store / TestFlight | iOS 앱을 릴리스할 때 |
| **제품 릴리스 노트** | `apps/web/src/constants/Update.ts` → 첫 번째 항목 | `/update` 페이지, 업데이트 알림 모달 | 사용자에게 알릴 만한 변경이 있을 때 |

이 외에는 버전을 갖는 대상이 없습니다.

## 왜 분리했는가

각 채널마다 고유한 제약이 있기 때문입니다.

- **Chrome 웹 스토어**는 동일한 버전의 재업로드를 거부하며 단조 증가하는 번호를
  요구합니다. 따라서 확장 프로그램 버전은 확장 프로그램이 실제로 배포될 때만
  움직여야 합니다.
- **App Store**는 자체 넘버링 체계를 가지며, 두 개의 값으로 나뉩니다.
  - `version`(마케팅 버전, `CFBundleShortVersionString`)은 `app.json`에 있으며
    **항상 수동으로** 수정합니다. `autoIncrement`는 이 값을 건드리지 않습니다.
  - 빌드 번호는 **레포지토리에 존재하지 않습니다**. `eas.json`이
    `appVersionSource: "remote"`와 `autoIncrement: true`를 설정하므로, EAS가
    서버 측에서 저장하고 증가시킵니다.

  이는 `cd-app.yml`이 실행하는 `eas build --local`에도 동일하게 적용됩니다.
  `--local`은 컴파일 단계만 러너로 옮길 뿐이며, EAS CLI는 여전히 자격 증명과
  버전 관리를 위해 EAS 서버와 통신합니다. 실제 CI 로그가 이를 확인해 줍니다.

  ```
  ✔ Incremented buildNumber from 48 to 49.
  ios.buildNumber field in app config is ignored when version source is set to
  remote. It's recommended to remove this value from app config.
  ```

  그래서 `ios.buildNumber`는 `app.json`에서 제거했습니다 — 서버가 49인 동안 이
  값은 낡은 `"6"`에 머물러 있었고, 애초에 무시되고 있었습니다.
- **웹(Web)**은 버전이 아예 없습니다. 지속적으로 배포되는 단일 인스턴스이므로
  "사용자가 설치한 버전"이라는 개념 자체가 없습니다. 특정 배포를 식별해야 한다면
  커밋 SHA나 Vercel 배포 ID를 사용하세요.

이전에는 루트 `package.json`의 단일 버전 번호가 확장 프로그램 manifest와 웹 업데이트
모달을 동시에 구동했습니다. 그 결과 웹을 배포하면 확장 프로그램의 스토어 버전이
올라가고 그 반대도 마찬가지였습니다. 이제 그 결합은 사라졌습니다.

## `package.json`의 version 필드

이 모노레포의 모든 패키지는 `private`이며 `workspace:*`로 참조됩니다. npm에 배포되는
패키지가 없으므로 `version` 필드는 아무 역할도 하지 않습니다. 오직
`apps/chrome-extension/package.json`만 `version`을 유지하는데, `manifest.js`가 그
값을 읽기 때문입니다.

다른 패키지에 `version`을 다시 추가하지 마세요.

## 릴리스 노트

`apps/web/src/constants/Update.ts`의 `UPDATE_LIST`가 제품 릴리스 버전의 단일 진실
원천입니다. 첫 번째 항목이 `LATEST_RELEASE_VERSION`으로 export되어 업데이트 알림
모달을 구동합니다.

각 항목의 `version` 문자열은 `ko`와 `en` `translation.json` 양쪽의
`updates.versions` 아래 키와 **정확히** 일치해야 합니다. 항목은 사용자의 흐름을
끊어서라도 알릴 가치가 있는 변경일 때만 추가하세요 — 항목 하나마다 모달이 한 번씩
노출됩니다.

## 버전 올리기

별도 스크립트는 없습니다. 각 트랙 모두 한 줄만 수정하면 됩니다.

```bash
# 확장 프로그램 — 확장 프로그램 릴리스 전
$EDITOR apps/chrome-extension/package.json     # "version": "1.10.15"

# 앱 — iOS 앱 릴리스 전
$EDITOR apps/app/app.json                      # "version": "1.0.8"

# 제품 릴리스 노트 — 사용자에게 알려야 할 때
$EDITOR apps/web/src/constants/Update.ts                        # 최상단에 새 항목 추가
$EDITOR apps/web/src/modules/i18n/locales/ko/translation.json   # updates.versions
$EDITOR apps/web/src/modules/i18n/locales/en/translation.json   # updates.versions
```

릴리스 노트 초안까지 함께 작성하려면 `/version-update`를 사용하세요.

버전 변경은 일반적인 Pull Request를 통해 `master`로 들어갑니다 —
[branch-strategy.md](branch-strategy.md)를 참고하세요. 릴리스 커밋에
`v<제품 릴리스 버전>` 태그를 붙이면 GitHub Release가 생성되며, 배포는 이후
Actions → **Release**에서 수행합니다.
