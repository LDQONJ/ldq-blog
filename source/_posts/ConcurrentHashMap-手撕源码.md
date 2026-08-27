---
title: ConcurrentHashMap 手撕源码
date: 2026-07-02 13:16:42
tags: [Java, ConcurrentHashMap]
hide: true
---

- ## 1. 成员变量
```java
// ----------------- 常量 -------------------
// 默认的 table 初始容量
private static final int DEFAULT_CAPACITY = 16;
// table 容量上限 -> 2 的 30 次方
private static final int MAXIMUM_CAPACITY = 1 << 30;
// 默认的负载因子
private static final float LOAD_FACTOR = 0.75f;
// 默认的并发度(并发度在 JDK 1.7 中用于控制分段锁的数量；JDK 1.8 中无实际意义，指定并发度可以约束预期容量)
private static final int DEFAULT_CONCURRENCY_LEVEL = 16;
// resizeStamp 位数
private static int RESIZE_STAMP_BITS = 16;
// resizeStamp 在 sizeCtl 中的偏移量
private static final int RESIZE_STAMP_SHIFT = 32 - RESIZE_STAMP_BITS;
// forwardingNode 的 hash 值
static final int MOVED = -1;
// 红黑树根节点的 hash 值
static final int TREEBIN = -2;
```
```java
// ----------------- 字段 -------------------
// 底层数组，长度必须为 2 的 n 次方，目的是使用与运算替代取余运算
transient volatile Node<K, V>[] table;
// 扩容时的新数组
private transient volatile Node<K, V>[] nextTable;
// 基础累加计数器，主要在没有线程竞争或者并发量不高时对其进行 CAS 累加
private transient volatile long baseCount;
// 累加单元数组，在竞争激烈时，CAS 失败的线程会随机选择一个累加单元进行 CAS 累加，持续失败会扩容该数组创建更多累加单元
private transient volatile CounterCell[] counterCells;
// sizeCtl 在不同时期的取值不同：
// 1. 初始化 table 前，sizeCtl = 未指定预期容量 ? 0 : 计算得到的初始容量 >= 0
// 2. 初始化 table 时，sizeCtl = -1 < 0
// 3. 初始化 table 后，sizeCtl = 扩容阈值 = 当前容量 * 负载因子 > 0
// 4. 在扩容 table 时，sizeCtl = resizeStamp << 16 | 参与扩容的线程数 + 1 < 0，此时 sizeCtl 首位为 1，是一个负数。
private transient volatile int sizeCtl;
```

- ## 2. 工具方法
```java
// c 为元素数量达到预期容量时不触发扩容的最小值，该方法会找到大于等于 c 的最小 2 的整数幂
private static final int tableSizeFor(int c) {
    int n = c - 1; // 减 1 防止原本就是 2 的整数幂
    // 让 n 把它的第一个 1 传播到后续所有位 1xxxxxxx -> 11xxxxxx -> 1111xxxx -> 11111111 -> ...
    // 最终 n 为 2 的 n 次方 - 1
    n |= n >>> 1;
    n |= n >>> 2;
    n |= n >>> 4;
    n |= n >>> 8;
    n |= n >>> 16;
    return (n < 0) ? 1 : (n >= MAXIMUM_CAPACITY) ? MAXIMUM_CAPACITY : n + 1;
}
// 获取节点的 hash 值
static final int spread(int h) {
    // 将原 hashCode 哈希扰动后取低 27 位，新的 hash 值的高 5 位为 0，是正数
    return (h ^ (h >>> 16)) & HASH_BITS;
}
// 获取 tab 的第 i 个节点
Node<K,V> tabAt(Node<K,V>[] tab, int i)
// 将 tab 的第 i 个节点 CAS c 为 v
boolean casTabAt(Node<K,V>[] tab, int i, Node<K,V> c, Node<K,V> v)
// 直接将 tab 的第 i 个节点设置为 v
void setTabAt(Node<K,V>[] tab, int i, Node<K,V> v)
```

- ## 3. 关键方法
```java
// 指定 “预期容量” 的构造器
public ConcurrentHashMap(int initialCapacity) {
    if (initialCapacity < 0)
        throw new IllegalArgumentException();
    // 判断给定的 “预期容量” 向上取 2 的整数幂后是否超过了 table 的容量上限
    int cap = ((initialCapacity >= (MAXIMUM_CAPACITY >>> 1)) ?
            // 超过上限直接以最大容量作为 “初始容量”
            MAXIMUM_CAPACITY :
            // 计算 table 真正的 “初始容量”
            // 这里乘 1.5 而不是除以 loadFactor（乘 1.333）是用空间换时间，计算效率大幅提高，同时也降低了哈希冲突和线程竞争的概率
            tableSizeFor(initialCapacity + (initialCapacity >>> 1) + 1));
    // 将 “初始容量” 赋值给 sizeCtl，暂时不初始化 table，用到时再创建（懒加载）
    this.sizeCtl = cap;
}
// 指定 “预期容量”、负载因子、并发度的构造器
public ConcurrentHashMap(int initialCapacity,
                         float loadFactor, int concurrencyLevel) {
    if (!(loadFactor > 0.0f) || initialCapacity < 0 || concurrencyLevel <= 0)
        throw new IllegalArgumentException();
    if (initialCapacity < concurrencyLevel)   // “预期容量” 不能小于并发度
        initialCapacity = concurrencyLevel;
    long size = (long)(1.0 + (long)initialCapacity / loadFactor);
    int cap = (size >= (long)MAXIMUM_CAPACITY) ?
        MAXIMUM_CAPACITY : tableSizeFor((int)size);
    this.sizeCtl = cap;
}


```
