---
title: "Elastic Beanstalk를 이용해 귀여운 Docker 자동화 배포 실습해보자"
date: "2024-06-18"
categories: 프론트엔드 DevOps 대외활동
draft: true
---

> 우선 해당 공부는 [docker-test](https://github.com/jiji-hoon96/docker-test) 레포를 이용했습니다.

문서를 열심히 읽어보아도 한 번의 실습이 더 값지다고 생각한다!

그렇기에 간단히 중요한 개념을 복습하고, 자주 사용하는 CRA부터 Elastic Beanstalk + Github Action + S3를 이용해 코드를 구현해보자

<br>

![1.jpeg](1.jpeg)

<br>

### 중요한 개념을 복습해보자.

1. **Dockerfile**: 기본 이미지, 종속성 및 실행 명령을 지정하여 Docker 이미지를 빌드하는 지침을 포함

2. **Docker 이미지**: 애플리케이션을 실행하는 데 필요한 모든 것(코드, 라이브러리 및 종속성)을 포함하는 경량의 독립 실행형 패키지로, Dockerfile에서 빌드되며 버전을 지정할 수 있다.

3. **Docker 컨테이너**: Docker 이미지의 실행 중인 인스턴스로, 컨테이너는 서로 격리되어 있고 호스트 시스템으로부터 격리되어 앱을 실행하기 위한 안전하고 재현 가능한 환경을 제공

4. **Docker 레지스트리**: Docker 이미지를 저장하고 배포하기 위한 중앙 집중식 리포지토리로, Docker Hub는 기본 공용 레지스트리이지만 개인 레지스트리를 설정할 수도 있다.

5. **Docker 볼륨**: 컨테이너에서 생성된 데이터를 유지하는 방법으로, 볼륨은 컨테이너의 파일 시스템 외부에 있으며 여러 컨테이너 간에 공유할 수 있다.

6. **Docker Compose**: 다중 컨테이너 Docker 애플리케이션을 정의하고 실행하기 위한 도구로, 전체 스택을 쉽게 관리할 수 있다.

<br>

![2.png](2.png)

<br>

### 도커를 이용해 개발 단계에서 CRA 실행해보기

그 이후 개발 환경의 도커 파일(Dockerfile.dev), 운영 환경의 도커 파일(Dockerfile)을 만들어줘야한다.

그렇게 만들어진 도커 파일을 가지고 도커 이미지를 생성하고, 이미지를 통해 컨테이너를 만들고, 컨테이너에서 앱을 실행하게 된다.

Dockerfile은 어떤 내용을 넣어줘야될까?

```markdown
FROM => Docker 이미지를 빌드할 때 기본이 되는 베이스 이미지를 지정
WORKDIR => 모든 명령어가 실행될 작업 디렉토리를 설정
COPY => 로컬 파일 시스템에서 Docker 이미지의 파일 시스템으로 파일을 복사
RUN => Docker 이미지 빌드 시에 실행할 명령어를 지정합니다. 주로 패키지 설치나 소프트웨어 설정에 사용
COPY
CMD => 컨테이너가 시작될 때 실행할 명령어를 지정한다. 주로 실행 파일이나 스크립트를 지정하는 데 사용된다. CMD는 Dockerfile 당 하나만 사용할 수 있다.
```

위 방법으로 `docker build .` 명령어를 실행해주니까 `unable to evaluate symlink` 에러가 발생했는데, dockerfile을 찾지 못하고 dockerfile.dev만 찾기 때문에 `-f 옵션`을 이용해 개발환경에서 사용할 수 있도록 수정했다.

docker을 이용해 build를 진행하니 `node_modules`의 용량이 무거워 `dockerignore` 또는 삭제를 하는 쪽으로 변경하는 것을 권장한다.

<br>

### 도커 이미지로 컨테이너 실행해 리액트 앱을 실행해보자.

`docker run 이미지 이름`을 하게 되면 포트 매핑이 안되어있어서, 컨테이너 내부로 리엑트가 도달하지 못해 **This site can't be reached** 오류가 발생한다.

이것을 해결하기 위해서는 `docker run -it -p 3000:3000 이미지 이름`을 이용해 포트 매핑을 해줘야 한다.

> 여기서 -i는 상호 입출력, -t는 tty를 활성화하여 bash shell을 사용하는 것이다.

<br>

### 볼륨을 이용해보자.

Volume을 설정하면 소스의 변경을 Live Server처럼 바로 반영되는 것을 확인할 수 있다. 그러면 명령어를 작성해보자.

`docker run -p 3000:3000 -v /usr/src/app/node_modules -v ${pwd}:/usr/src/app 이미지 아이디` 로 작성하면된다.

어지러워서 천천히 확인해보면, node_modules이 호스트 디렉토리에 없어서 컨테이너에게 매핑을 하지 말라고 명령하는 `/usr/src/app/node_modules`이 있고, pwd 경로에 있는 디렉토리 파일을 `usr/src/app` 참조하도록 한다.

<br>

### 도커 컴포즈를 이용하자.

앞에 명령어 너무 길어서 어떻게 줄일 수 있을까 고민을 했는데 **Docker Compose**를 이용하면 된다는 것을 알게 되었다.

docker-compose.yml을 작성해보자.

```markdown
version: "3" => 도커 컴포저의 버전
services:
react: => 컨테이너 이름
build:
context: . => 도커 이미지를 구성하기 위한 파일과 폴더들이 있는 위치
dockerfile: Dockerfile.dev => 어떤 도커 파일인지
ports: - "3000:3000" => 컨테이너 포트번호
volumes: - /usr/src/app/node_modules - ./:usr/src/app
stdin_open: true => 리앱트 앱을 끌때 필요한 코드
```

완성이 되었으면 docker-compose를 `docker-compose up` 명령어를 이용해 실행해보자

테스트 코드 배포도 동일하게 하면된다. 명령어만 조금 수정하면! ~~귀찮아서 패스하겠다~~

<br>

### 운영환경의 도커파일 작성과 Nginx를 활용해보자

운영환경에서 배포를 하려면 Nginx가 필요하다. 이유는 서버 트래픽도 분산시키고, 데이터 전송에 보안을 강화하고, 리버스 프록시로도 동작할 수 있기 때문이다. 뭐 간단하게 생각하면 정적 파일을 빠르게 서버를 이용해 다룰 때 사용한다.

Nginx를 이용하기 위해 Dockerfile에는 2가지 옵션을 추가해줘야 한다.

```markdown
From nginx
COPY --from=builder /usr/src/app/build /usr/share/nginx/html
```

위 내용은 [Dockerhub 공식 Nginx](https://hub.docker.com/_/nginx)에 상세하게 기록되어있으니 확인해주세요~

참고로 운영서버에서 실행시키려면 포트번호를 Nginx 기본 사용 포트인 80번으로 해야한다.

<br>

### Github Action + AWS를 이용해 배포해보자.

Github Action을 설정하는 방법은 [여기를](https://docs.github.com/ko/actions) 확인해보면 좋다.

자동화 배포를 하기 위해서는 AWS의 IAM ROLE, Elastic Beanstalk, S3등이 필요한데, 설정 방법은 자료가 많기 때문에, 각각을 왜 사용하고 어떤것인지 찾아보자

아 맞다.. Github Action을 활용하기 위해서는 아까 저장해둔 액세스키, 비밀 엑세스키, 도커 관련된 설정등도 값을 넣어줘야된다.

<br>

## IAM Role

IAM Roles(Identity and Access Management Roles)은 AWS 리소스에 접근 권한을 부여하는 데 사용된다.

실습을 하면서 아래 조건들에 대한 설정을 해주었다. 너무 어려워보여서 일단 체크만 하고 넘어갔는데, **IAM Role**에서 왜 선택해주었는지 찾아보자

<br>

### AWSElasticBeanstalkMulticontainerDocker

이 역할은 Elastic Beanstalk에서 다중 컨테이너 Docker 환경을 지원하는 데 사용된다. 또한 아래와 같은 역할을 포함하고 있다.

- Elastic Beanstalk 환경의 컨테이너 설정 및 관리 및 Docker 컨테이너를 시작하고 중지하는 역할
- Elastic Load Balancing (ELB), Amazon EC2 인스턴스, Amazon S3 버킷 등의 AWS 리소스에 접근하여 컨테이너를 배포하고 관리하는 작업을 수행

이 역할은 Docker Compose를 사용하여 여러 Docker 컨테이너를 조정하는 Elastic Beanstalk 환경에서 필수적이기때문에, 꼭 설정해줘야한다.

<br>

### AWSElasticBeanstalkWebTier

이 역할은 Elastic Beanstalk의 웹 애플리케이션 환경에서 사용된다. 주로 웹 서버 역할을 수행하는 애플리케이션에 필요한 권한을 제공하며 아래와 같은 작업을 수행할 수 있는 권한을 포함하고 있다.

- 애플리케이션 로그를 Amazon S3 버킷에 업로드
- Elastic Beanstalk 환경의 상태를 모니터링하고 CloudWatch 로그를 관리
- Amazon EC2 인스턴스 및 기타 AWS 리소스와의 상호작용

웹 티어는 사용자가 직접 상호작용하는 프론트엔드 웹 서버 애플리케이션에 적합한 역할이다.

<br>

### AWSElasticBeanstalkWorkerTier

이 역할은 Elastic Beanstalk의 워커 애플리케이션 환경에서 사용된다. 주로 백그라운드 작업을 처리하는 애플리케이션에 필요한 권한을 제공하며 아래와 같은 작업을 수행할 수 있는 권한을 포함하고 있다.

- SQS (Simple Queue Service) 메시지를 처리
- 애플리케이션 로그를 Amazon S3 버킷에 업로드
- 백그라운드 작업 및 비동기 작업을 수행하기 위해 Amazon EC2 인스턴스와 상호작용.

워커 티어는 주로 백엔드에서 처리해야 하는 긴 작업이나 비동기 작업을 수행하는 데 적합한 역할이다. 주로 이메일 알림 전송, 이미지 처리, 데이터베이스 백업과 같은 작업에 사용된다.

<br>

## Elastic Beanstalk

**Elastic Beanstalk** 이름이 너무 낯설다. 간단하게 설명해보면, 개발자가 애플리케이션을 쉽게 배포하고 확장할 수 있도록 해주는 **Paas(Platform as a Service)** 서비스이다.

개발자가 애플리케이션 코드를 업로드하면, Elastic Beanstalk은 배포, 프로비저닝, 로드 벨런싱, 확장, 모니터링 등을 자동으로 처리해준다.

> [프로비저닝(provisioning)](https://hong-yp-ml-records.tistory.com/125)
>
> > IT 인프라를 생성하고 설정하는 프로세스다. 서버, 애플리케이션, 네트워크, 스토리지 등을 배포하는 과정의 가장 초기 단계를 의미한다.
> > <br>

> [로드 벨런싱(Load Balancing)](https://aws.amazon.com/ko/what-is/load-balancing/)
>
> > 로드 밸런싱은 애플리케이션을 지원하는 리소스 풀 전체에 네트워크 트래픽을 균등하게 배포하는 방법이다.
>
> > 많은 양의 트래픽을 처리하기 위해 대부분의 애플리케이션에는 데이터가 중복되는 리소스 서버가 많이 있는데, 로드 밸런서는 사용자와 서버 그룹 사이에 위치하며 보이지 않는 촉진자 역할을 하여 모든 리소스 서버가 동일하게 사용되도록 한다.

<br>

### 오잉? EC2랑 뭐가 다름?

우리가 자주 사용하는 EC2도 **Elastic Compute Cloud**로 같은 Elastic이다. ~~ㅋㅋㅋㅋ~~

EC2는 가상의 서버를 제공하는 **Iaas(Infrastructure as a Service)** 서비스다. 가상 머신 생성, 시작, 정지, 삭제와 같은 모든 작업을 직정 수행할 수 있다.

두개의 가장 큰 차이는 Elastic Beanstalk는 개발자가 애플리케이션 코드를 업로드하면 AWS가 배포 및 관리를 자동화하는 PaaS 서비스서비스이며, EC2는 가상 서버를 직접 관리해야 하는 IaaS 서비스이다.

<br>

### EC2 대신 Elastic Beanstalk을 사용했을까?

EC2를 사용하면 작업을 수동으로 설정하고 관리해야한다. 하지만 Elastic Beanstalk은 애플리케이션 배포와 관리를 자동으로 처리해준다. 이를 통해 사용자는 인프라 구성, 서버 설정, 로드 밸런싱, 스케일링 등을 직접 관리할 필요가 없어지는 장점이 생긴다.

또한 통합 모니터링 및 로깅을 쉽게 파악할 수 있고, 다양한 언어 환경에서 쉽게 애플리케이션을 배포할 수 있다.

**자동화** 를 위해 사용했다는 것을 복습해보니 알게되었다.

<br>

### S3 설정 변경 및 IAM 유저 생성

S3는 AWS의 객체 스토리지 서비스로, 데이터를 안전하고 확장 가능하게 저장하게 도와준다. 대용량의 데이터를 저장할 수 있어서 데이터 관리에 용이하다.

S3에 들어가서 객체 소유권을 편집해준다. ACL 활성화해주면 된다.

그 이후 IAM 유저를 생성해주고 액세스 키와 비밀 액세스 키를 저장해줘야한다. 나중에 깃헙에 넣어야되기 때문!

<br>

## 소감

![3.webp](3.webp)

<br>

이러면 배포는 된다. 하지만.. 너무 넘어야 할 산이 많다. 아직 도커 컨테이너와 이미지를 다루기도 어렵고, yaml 파일을 어떻게 작성하는지도.. 코드를 좀 더 살펴보아야겠다!

```toc

```
