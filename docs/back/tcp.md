# TCP 协议

职责：
- 客户端发送请求，将 HTTP 请求报文分割成报文段，传给 IP 协议
- 服务端接收请求，将收到的报文段，重组请求报文

建立、断开工作流：

- C 发送 SYN
- S 相应 SYN/ACK
- C 发送 ACK
- 请求 <=> 相应
- S FIN
- C ACK
- C FIN
- S ACK