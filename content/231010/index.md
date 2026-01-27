---
emoji: 1️⃣
title: "Singleton Pattern을 간단하게 알아보자!"
date: "2023-10-10"
categories: 소박한궁금증 자바스크립트
draft: true
---

## Singleton Pattern

싱글톤 패턴은 특정 클래스의 인스턴스가 오직 하나만 생성되도록 보장하며, 이 인스턴스에 전역적으로 접근할 수 있게 하는 디자인 패턴이다.

싱글톤 패턴은 전역 변수를 사용하지 않고도 전역적인 접근을 제공하여, 공유 자원에 대한 동시 접근을 제어할 수 있어, 자원 관리와 동시성 제어에 중요한 시스템이다.

자바스크립트에서는 클래스를 사용하지 않고도 싱글톤 패턴을 구현할 수 있다. 왜냐하면 자바스크립트는 프로토타입 기반 언어이기 때문에 일반적인 함수와 객체, 클로저를 사용하여 싱글톤 패턴을 구현할 수 있다.

```javascript
class Singleton {
  constructor(data) {
    if (Singleton.instance) {
      return Singleton.instance;
    }
    this.data = data || "Initial data";
    Singleton.instance = this;
  }

  getData() {
    return this.data;
  }

  setData(data) {
    this.data = data;
  }
}

const singleton = new Singleton("First data");
console.log(singleton.getData());

const anotherSingleton = new Singleton("Second data");
console.log(anotherSingleton.getData());

singleton.setData("Updated data");
console.log(anotherSingleton.getData());
```

위 예시에서 `Singleton` 클래스는 처음 생성될 때만 새로운 인스턴스를 생성하며, 이후에는 기존 인스턴스를 반환한다. `getData`와 `setData` 메서드를 통해 데이터를 가져오고 설정할 수 있다.

<br>

또한 **자바스크립트의 함수와 프로토타입을 사용**하여 싱글톤 패턴을 구현할 수 있다.

```javascript
function Singleton(data) {
  if (Singleton.instance) {
    return Singleton.instance;
  }
  this.data = data || "Initial data";
  Singleton.instance = this;
}

Singleton.prototype.getData = function () {
  return this.data;
};

Singleton.prototype.setData = function (data) {
  this.data = data;
};

const singleton = new Singleton("First data");
console.log(singleton.getData());

const anotherSingleton = new Singleton("Second data");
console.log(anotherSingleton.getData());

singleton.setData("Updated data");
console.log(anotherSingleton.getData());
```

<br>

그리고 **즉시 실행 함수 표현식(IIFE)을** 사용하여 싱글톤 패턴을 구현할 수 있다.

```javascript
const Singleton = (function () {
  function SingletonClass(data) {
    if (SingletonClass.instance) {
      return SingletonClass.instance;
    }
    this.data = data || "Initial data";
    SingletonClass.instance = this;
  }

  SingletonClass.prototype.getData = function () {
    return this.data;
  };

  SingletonClass.prototype.setData = function (data) {
    this.data = data;
  };

  return SingletonClass;
})();

const singleton = new Singleton("First data");
console.log(singleton.getData());

const anotherSingleton = new Singleton("Second data");
console.log(anotherSingleton.getData());

singleton.setData("Updated data");
console.log(anotherSingleton.getData());
```

위 예시는 IIFE를 사용하여 `SingletonClass`를 내부에 캡슐화하고, 외부에서 직접 접근할 수 없도록 한다. `Singleton` 변수는 `SingletonClass`의 인스턴스를 생성하고 반환하는 역할을 한다.
