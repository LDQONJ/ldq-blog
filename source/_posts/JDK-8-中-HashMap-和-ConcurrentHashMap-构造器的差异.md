---
title: JDK 8 中 HashMap 和 ConcurrentHashMap 构造器的差异
date: 2026-07-02 10:43:52
tags:
hide: true
---

- 在指定 `initialCapacity` 创建 `HashMap` 时，需要程序员手动计算出存入预期数量后不触发扩容的容量，即 `size / loadFactor + 1`，构造器会自动向上取最接近的一个 `2 的整数幂` 作为容器的初始容量，以保证计算数组下标时可以使用 `hash & (n - 1)`，相较于直接取余运算速度更快。

- 在指定 `initialCapacity` 创建 `ConcurrentHashMap` 时，只需传入预期存入数量，构造器内部会自动计算不触发扩容的最小 2 的整数幂作为容器的初始容量。

- JDK 19 开始的版本提供了 `HashMap.newHashMap(size)` 静态方法，可以像 `ConcurrentHashMap` 构造器一样自动创建合适容量的容器。

