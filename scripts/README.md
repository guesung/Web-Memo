# Sonarqube
## 1. Sonarqube 설치 및 실행
1. [SonarQube Developer Edition](https://www.sonarsource.com/products/sonarqube/downloads/success-download-developer-edition/)으로 설치하면 됩니다.
2. `$ pnpm run sonarqube`
    - 만약 권한 오류가 뜬다면, `$chmod 755 *.sh`로 모든 shell파일에 대해 권한을 열어주세요.
    - 실행이 완료되면, `localhost:9000`으로 접속할 수 있습니다.

## 2. Sonarqube 프로젝트 생성
1. 프로젝트명은 `web-memo`이며, local에서 사용할 수 있도록 프로젝트를 생성합니다.
2. 생성된 프로젝트의 토큰을 복사합니다.(3번에서 사용합니다)

## 2. Sonarqube scanner 실행을 위한 전역 변수 설정
1. `$ vi /etc/profile`
2. 마지막 줄에 `export SONAR_TOKEN=2번에서 복사한토큰` 입력
    - `:wq!`로 덮어쓰기를 해야 저장이 됩니다.
3. `$ source /etc/profile`

## 3. Sonarqube Scanner 실행
1. `$ pnpm run sonarqube-scan`
    - 만약 에러가 난다면, sonarqube를 정상적으로 실행했고, 로그인을 했고, 프로젝트 등록을 했는지 확인해주세요.