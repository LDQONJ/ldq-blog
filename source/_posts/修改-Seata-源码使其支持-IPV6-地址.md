---
title: 修改 Seata 源码使其支持 IPV6 地址
date: 2026-07-18 14:50:06
tags: [Seata,IPV6]
---

## 问题：
在使用 Seata v1.6.1 时，客户端通过 IPV6 only 的域名访问 seata-server 时，会把解析到的 IPV6 地址简单粗暴地从第一个 `:` 处分割，前半部分作为 IP，后半部分作为端口号，这在 IPV4 的情况下能够正常工作，但是 IPV6 地址是冒分十六进制，其中有多个冒号，这种分割的方法会把 IPV6 地址从第一个冒号处分为两半，导致后续创建连接时会报错。

## 解决方法：
从 Github 下载 [Seata v1.6.1 源码](https://github.com/apache/incubator-seata/archive/refs/tags/v1.6.1.zip)，修改两处代码。

- `common/src/main/java/io/seata/common/util/NetUtil.java 81行`
```java
public static InetSocketAddress toInetSocketAddress(String address) {
    int i = address.indexOf(':');
    i = address.lastIndexOf(':'); // 获取最后一个冒号的位置，而不是第一个
    String host;
    int port;
    if (i > -1) {
        host = address.substring(0, i);
        port = Integer.parseInt(address.substring(i + 1));
    } else {
        host = address;
        port = 0;
    }
    return new InetSocketAddress(host, port);
}
```
- `core/src/main/java/io/seata/core/rpc/netty/NettyClientChannelManager.java 199行`
```java
if (CollectionUtils.isNotEmpty(channelAddress)) {
    List<InetSocketAddress> aliveAddress = new ArrayList<>(channelAddress.size());
    for (String address : channelAddress) {
        String[] array = address.split(":");
        // 从最后一个冒号处分割，而不是第一个
        int i = address.lastIndexOf(':');
        array[0] = address.substring(0, i);
        array[1] = address.substring(i + 1);
        aliveAddress.add(new InetSocketAddress(array[0], Integer.parseInt(array[1])));
    }
    RegistryFactory.getInstance().refreshAliveLookup(transactionServiceGroup, aliveAddress);
}
```
- 修改完成后运行 `mvn clean compile -DskipTest`、`mvn install` 即可将修改后的 Seata 安装到本地 Maven 仓库。