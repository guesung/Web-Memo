### 1. Sonarqube 실행
1. `$ ./scripts/run-sonarqube.sh`
2. `localhost:9000`으로 접속


### 2. Sonarqube scanner 실행을 위한 전역 변수 설정
1. `$ vi /etc/profile`
2. `export SONAR_TOKEN=SONAR_TOKEN` 입력. 
    - 토큰값은 SonarQube 실행 시, localhost:9000에서 얻을 수 있습ㄴ디ㅏ.
3. `$ source /etc/profile`


### 3. Sonarqube Scanner 실행
1. `$ ./scripts/run-sonarscanner.sh`