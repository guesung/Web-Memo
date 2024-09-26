# Sonarqube
## 1. Sonarqube 실행
1. `$ pnpm run sonarqube`
    - 만약 권한 오류가 뜬다면, `$chmod 755 *.sh`로 모든 shell파일에 대해 권한을 열어주세요.
2. `localhost:9000`으로 접속

## 2. Sonarqube 프로젝트 생성
1. 이름 : web-memo, local에서 사용할 수 있도록 프로젝트를 생성합니다.
2. 생성된 프로젝트의 토큰을 복사합니다.(3번에서 사용합니다.)

## 2. Sonarqube scanner 실행을 위한 전역 변수 설정
1. `$ vi /etc/profile`
2. `export SONAR_TOKEN=SONAR_TOKEN` 입력. 
    - 토큰값은 SonarQube 실행 시, localhost:9000에서 얻을 수 있습니다.
    - `:wq!`로 덮어쓰기를 해야 저장이 됩니다.
3. `$ source /etc/profile`

## 3. Sonarqube Scanner 실행
1. `$ pnpm run sonarqube-scan`
    - 만약 에러가 난다면, sonarqube를 정상적으로 실행했고, 로그인을 했고, 프로젝트 등록을 했는지 확인해주세요.