---
emoji: 💡
title: 'LinkedList? ArrayList?'
date: '2024-04-24'
categories: 소박한궁금증 자료구조
---

![3.png](2.png)

<br>

<h4>링크드인을 접속할려고 했다.</h4>

<br>

![1.png](1.png)

<br>

Linked... 라고 치는데 밑에 LinkedList가 나왔다.. ~~(그 와중에 린다닷컴은 뭐지?)~~

그 이후에 새로 알게된 내용이 많아 기록을 남겨볼려고한다.

<br>

## LikedList

LinkedList는 내부적으로 양방향의 연결 리스트로 구성되어 있어 참조하려는 원소에 따라 처음부터 정방향 또는 역순으로 순회할 수 있다.

적은 양의 데이터를 추가하거나 삭제할 때는 문제가 없지만, 양이 많아질수록 속도가 늦어지는 배열의 단점을 보완하기 위해 LinkedList가 생겨났다.

LinkedList는 순차적 접근이고, 해당 위치의 노드를 찾는 데에 시간이 소비되어 검색의 속도가 느리다. 그렇지만 LinkedList는 데이터를 추가·삭제시 가리키고 있는 주소 값만 변경해주면 되기 때문에 ArrayList에 비해 상당히 효율적이고 중간에 있는 노드를 삭제해주면 양쪽에 있는 노드를 서로 이어주면 되기 때문에 ArrayList보다 상대적으로 작업이 빠르다.

<br>

### 단점

데이터를 get 하는 과정에서 ArrayList는 무작위 접근이 가능하지만, **LinkedList에서는 순차접근만 가능**하다. 그렇기 때문에 여러 곳은 산재해 저장되어있는 노드들을 접근하는데 있어서 긴 시간이 소요된다. 특히 singly LinkedList는 단방향성을 지니고 있기 때문에, index를 이용하여 자료를 검색하는 애플리케이션에는 적합하지 않다.

참조자(next, prev)를 위해 추가적인 메모리를 할당해야되어서 **추가적인 공간이 필요**하다.

<br>

## ArrayList

ArrayList는 기본적으로 배열을 사용하지만 일반 배열과 차이점이 있다.

일반 배열은 처음에 메모리를 할당할 때 크기를 지정해주어야 하지만, ArrayList는 크기를 지정하지 않고 동적으로 값을 삽입하고 삭제할 수 있다.

ArrayList는 각 데이터의 index를 가지고 있고 무작위 접근이 가능하기 때문에, 해당 index의 데이터를 한번에 가져올 수 있고 데이터의 삽입과 삭제시 위치에 따라 그 위치까지 이동하는 시간이 발생한다. 삽입과 삭제가 많다면 ArrayList는 비효율적이다.

### 단점

데이터들이 지속적으로 삭제되는 과정에서 ArrayList에서는 그 공간 만큼 낭비되는 메모리가 많아지게 되고, **리사이징 처리에서 시간이 많이 소모**된다.

<br>

## 그래서 뭘 써야할까?

![4.png](4.png)

ArrayList 와 LinkedList 중에 어느걸 사용하면 되냐고 묻는다면, **삽입 / 삭제가 빈번하면 LinkedList**를, **요소 가져오기가 빈번하면 ArrayList**를 사용하면 된다.

하지만 실질적으로 별 차이가 없다(테스트 진행할 때 나노초까지 비교해야 차이가 보이기 때문)

<br>

## 출처 및 도움되는 링크들

- [LinkedList](https://opentutorials.org/module/1335/8821)

```toc

```