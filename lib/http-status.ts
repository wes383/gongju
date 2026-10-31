export interface HttpStatus {
  code: number;
  name: string;
  zh: string;
  en: string;
  /** Vendor or server specific, not registered with IANA */
  nonStandard?: boolean;
}

/** Common HTTP status codes with a one-line explanation in both languages. */
export const HTTP_STATUS: HttpStatus[] = [
  { code: 100, name: "Continue", zh: "继续。客户端应继续发送请求剩余部分。", en: "Continue. The client should keep sending the request body." },
  { code: 101, name: "Switching Protocols", zh: "切换协议。服务端同意按 Upgrade 头切换协议（如 WebSocket）。", en: "Switching Protocols. The server agrees to switch protocols as requested by Upgrade." },
  { code: 102, name: "Processing", zh: "处理中。请求已收到，正在处理但还没有结果。", en: "Processing. The request was received and is being handled, no result yet." },
  { code: 103, name: "Early Hints", zh: "早期提示。在最终响应前先返回部分头，用于预加载资源。", en: "Early Hints. Sends headers before the final response so clients can preload." },

  { code: 200, name: "OK", zh: "成功。请求已正常处理并返回内容。", en: "OK. The request succeeded and the body carries the result." },
  { code: 201, name: "Created", zh: "已创建。请求成功并新建了资源，通常在 Location 头返回地址。", en: "Created. A new resource was created; its URL is usually in the Location header." },
  { code: 202, name: "Accepted", zh: "已接受。请求已进入队列，处理尚未完成。", en: "Accepted. The request is queued for processing and is not finished yet." },
  { code: 203, name: "Non-Authoritative Information", zh: "非授权信息。返回的元数据来自缓存副本而非源服务器。", en: "Non-Authoritative Information. Metadata came from a cached copy, not the origin." },
  { code: 204, name: "No Content", zh: "无内容。处理成功但没有响应体，常用于 DELETE 与 PUT。", en: "No Content. Succeeded with no body, typical for DELETE and PUT." },
  { code: 205, name: "Reset Content", zh: "重置内容。要求客户端重置文档视图（如清空表单）。", en: "Reset Content. Asks the client to reset the document view, such as clearing a form." },
  { code: 206, name: "Partial Content", zh: "部分内容。返回的是资源的一段，用于断点续传或分片下载。", en: "Partial Content. A byte range of the resource, used for resumable downloads." },
  { code: 207, name: "Multi-Status", zh: "多状态。WebDAV 使用，响应体里包含多个子请求的状态。", en: "Multi-Status. WebDAV response carrying several sub-request statuses." },
  { code: 208, name: "Already Reported", zh: "已报告。WebDAV 中避免重复列出同一资源。", en: "Already Reported. WebDAV hint that a resource was listed in an earlier response." },
  { code: 226, name: "IM Used", zh: "实例操作已应用。服务端已完成对资源的增量修改。", en: "IM Used. The server applied delta updates to the resource." },

  { code: 300, name: "Multiple Choices", zh: "多种选择。请求的资源有多个可选地址。", en: "Multiple Choices. The resource has several representations to pick from." },
  { code: 301, name: "Moved Permanently", zh: "永久重定向。资源已永久迁移，搜索引擎会更新索引。", en: "Moved Permanently. The resource moved for good; caches and indexes should update." },
  { code: 302, name: "Found", zh: "临时重定向。本次请求应去新地址，后续仍用原地址。", en: "Found. Temporary redirect for this request; keep using the original URL." },
  { code: 303, name: "See Other", zh: "查看其他地址。用 GET 访问 Location 指向的结果。", en: "See Other. Fetch the result at Location with GET." },
  { code: 304, name: "Not Modified", zh: "未修改。缓存仍有效，服务端不返回响应体。", en: "Not Modified. The cached copy is still valid, so no body is sent." },
  { code: 305, name: "Use Proxy", zh: "使用代理。必须通过指定代理访问（已废弃）。", en: "Use Proxy. Access must go through the given proxy (deprecated)." },
  { code: 307, name: "Temporary Redirect", zh: "临时重定向。与 302 类似，但要求保持原请求方法。", en: "Temporary Redirect. Like 302 but the request method must not change." },
  { code: 308, name: "Permanent Redirect", zh: "永久重定向。与 301 类似，但要求保持原请求方法。", en: "Permanent Redirect. Like 301 but the request method must not change." },

  { code: 400, name: "Bad Request", zh: "请求有误。参数格式或语法有问题，服务端无法理解。", en: "Bad Request. Malformed syntax or invalid parameters." },
  { code: 401, name: "Unauthorized", zh: "未认证。缺少或无效的凭证，需要先登录。", en: "Unauthorized. Credentials are missing or invalid; authenticate first." },
  { code: 402, name: "Payment Required", zh: "需要付费。预留状态码，部分 API 用于表示额度不足。", en: "Payment Required. Reserved; some APIs use it for exhausted quota." },
  { code: 403, name: "Forbidden", zh: "禁止访问。身份已知但没有权限。", en: "Forbidden. The identity is known but not allowed." },
  { code: 404, name: "Not Found", zh: "未找到。资源不存在，或不想暴露其存在。", en: "Not Found. The resource does not exist, or is hidden on purpose." },
  { code: 405, name: "Method Not Allowed", zh: "方法不允许。资源存在但不支持该 HTTP 方法。", en: "Method Not Allowed. The resource exists but not for this HTTP method." },
  { code: 406, name: "Not Acceptable", zh: "无法接受。服务端无法提供 Accept 头要求的内容类型。", en: "Not Acceptable. The server cannot produce anything matching the Accept header." },
  { code: 407, name: "Proxy Authentication Required", zh: "需要代理认证。先向代理提供凭证。", en: "Proxy Authentication Required. Authenticate with the proxy first." },
  { code: 408, name: "Request Timeout", zh: "请求超时。客户端在服务端等待时间内没有发完请求。", en: "Request Timeout. The client did not finish sending in time." },
  { code: 409, name: "Conflict", zh: "冲突。请求与资源当前状态冲突，如并发编辑。", en: "Conflict. The request clashes with the resource's current state." },
  { code: 410, name: "Gone", zh: "已删除。资源曾经存在，现在永久不可用。", en: "Gone. The resource existed but is permanently unavailable." },
  { code: 411, name: "Length Required", zh: "需要长度。请求缺少 Content-Length。", en: "Length Required. The request is missing Content-Length." },
  { code: 412, name: "Precondition Failed", zh: "前置条件失败。If-Match 等条件不成立。", en: "Precondition Failed. A condition such as If-Match did not hold." },
  { code: 413, name: "Content Too Large", zh: "内容过大。请求体超过服务端限制。", en: "Content Too Large. The request body exceeds the server limit." },
  { code: 414, name: "URI Too Long", zh: "URI 过长。请求地址超出服务端可处理长度。", en: "URI Too Long. The URL is longer than the server accepts." },
  { code: 415, name: "Unsupported Media Type", zh: "媒体类型不支持。请求体的 Content-Type 不被接受。", en: "Unsupported Media Type. The request Content-Type is not accepted." },
  { code: 416, name: "Range Not Satisfiable", zh: "范围无法满足。请求的字节范围超出资源大小。", en: "Range Not Satisfiable. The requested byte range is outside the resource." },
  { code: 417, name: "Expectation Failed", zh: "期望失败。Expect 头的要求无法满足。", en: "Expectation Failed. The Expect header cannot be met." },
  { code: 418, name: "I'm a Teapot", zh: "我是茶壶。愚人节玩笑状态码，常被用来做彩蛋。", en: "I'm a Teapot. An April Fools' code, widely used as an easter egg." },
  { code: 421, name: "Misdirected Request", zh: "请求被错误定向。该连接无法为该域名提供服务。", en: "Misdirected Request. This connection cannot serve that host." },
  { code: 422, name: "Unprocessable Content", zh: "内容无法处理。语法正确但语义有误，常用于表单校验。", en: "Unprocessable Content. Syntax is fine but the semantics are wrong; common for form validation." },
  { code: 423, name: "Locked", zh: "已锁定。目标资源被锁定（WebDAV）。", en: "Locked. The target resource is locked (WebDAV)." },
  { code: 424, name: "Failed Dependency", zh: "依赖失败。因为前一个请求失败导致本请求无法执行。", en: "Failed Dependency. This request failed because a previous one did." },
  { code: 425, name: "Too Early", zh: "过早。服务端不愿意处理可能被重放的请求。", en: "Too Early. The server declines to process a request that might be replayed." },
  { code: 426, name: "Upgrade Required", zh: "需要升级。客户端应改用更高版本的协议。", en: "Upgrade Required. The client should switch to a newer protocol." },
  { code: 428, name: "Precondition Required", zh: "需要前置条件。服务端要求带上 If-Match 等条件避免并发覆盖。", en: "Precondition Required. The server wants If-Match and friends to avoid lost updates." },
  { code: 429, name: "Too Many Requests", zh: "请求过多。触发限流，稍后再试。", en: "Too Many Requests. Rate limited; retry later." },
  { code: 431, name: "Request Header Fields Too Large", zh: "请求头过大。头部总大小超出限制。", en: "Request Header Fields Too Large. Header size exceeds the limit." },
  { code: 451, name: "Unavailable For Legal Reasons", zh: "因法律原因不可用。内容被审查或封禁。", en: "Unavailable For Legal Reasons. Blocked for legal or censorship reasons." },

  { code: 420, name: "Enhance Your Calm", zh: "冷静一下。Twitter 早期用于限流，非标准状态码。", en: "Enhance Your Calm. Twitter's old rate-limit code; not standard.", nonStandard: true },
  { code: 444, name: "No Response", zh: "无响应。nginx 直接关闭连接，不返回任何内容。", en: "No Response. nginx closes the connection without replying.", nonStandard: true },
  { code: 449, name: "Retry With", zh: "需要补充信息。微软提出，要求客户端带更多信息重试。", en: "Retry With. Microsoft's hint to retry with more information.", nonStandard: true },
  { code: 499, name: "Client Closed Request", zh: "客户端主动断开。nginx 记录，通常说明用户等不及关掉了页面。", en: "Client Closed Request. Logged by nginx when the client hangs up first.", nonStandard: true },

  { code: 500, name: "Internal Server Error", zh: "服务器内部错误。代码抛异常了，看服务端日志。", en: "Internal Server Error. The server threw; check its logs." },
  { code: 501, name: "Not Implemented", zh: "未实现。服务端不支持该请求方法。", en: "Not Implemented. The server does not support this method." },
  { code: 502, name: "Bad Gateway", zh: "网关错误。网关从上游收到无效响应，常见于后端服务挂了。", en: "Bad Gateway. A gateway got an invalid response from upstream." },
  { code: 503, name: "Service Unavailable", zh: "服务不可用。过载或维护中，通常会带 Retry-After。", en: "Service Unavailable. Overloaded or in maintenance; often includes Retry-After." },
  { code: 504, name: "Gateway Timeout", zh: "网关超时。上游服务没有及时响应。", en: "Gateway Timeout. The upstream did not respond in time." },
  { code: 505, name: "HTTP Version Not Supported", zh: "HTTP 版本不支持。", en: "HTTP Version Not Supported." },
  { code: 506, name: "Variant Also Negotiates", zh: "变体协商错误。内容协商配置有循环。", en: "Variant Also Negotiates. The content negotiation config loops." },
  { code: 507, name: "Insufficient Storage", zh: "存储不足。WebDAV 中表示无法保存。", en: "Insufficient Storage. WebDAV cannot store the representation." },
  { code: 508, name: "Loop Detected", zh: "检测到循环。WebDAV 处理时发现无限循环。", en: "Loop Detected. WebDAV hit an infinite loop." },
  { code: 510, name: "Not Extended", zh: "未扩展。需要进一步扩展请求。", en: "Not Extended. Further extensions to the request are required." },
  { code: 511, name: "Network Authentication Required", zh: "需要网络认证。常见于公共 WiFi 的登录门户。", en: "Network Authentication Required. Typical of a public WiFi captive portal." },
  { code: 509, name: "Bandwidth Limit Exceeded", zh: "带宽超限。cPanel 主机常见，站点当月流量用完了。", en: "Bandwidth Limit Exceeded. cPanel hosts use this when the monthly quota is gone.", nonStandard: true },
  { code: 520, name: "Unknown Error", zh: "未知错误。Cloudflare 从源站收到空响应或异常响应。", en: "Unknown Error. Cloudflare got an empty or malformed response from the origin.", nonStandard: true },
  { code: 521, name: "Web Server Is Down", zh: "源站宕机。Cloudflare 无法与源站建立连接。", en: "Web Server Is Down. Cloudflare cannot connect to the origin.", nonStandard: true },
  { code: 522, name: "Connection Timed Out", zh: "连接超时。Cloudflare 与源站的 TCP 握手超时。", en: "Connection Timed Out. The TCP handshake with the origin timed out.", nonStandard: true },
  { code: 523, name: "Origin Is Unreachable", zh: "源站不可达。通常是 DNS 或路由问题。", en: "Origin Is Unreachable. Usually a DNS or routing problem.", nonStandard: true },
  { code: 524, name: "A Timeout Occurred", zh: "响应超时。连接建立了，但源站没在 100 秒内返回。", en: "A Timeout Occurred. Connected, but the origin did not answer within 100 seconds.", nonStandard: true },
  { code: 525, name: "SSL Handshake Failed", zh: "SSL 握手失败。Cloudflare 与源站的 HTTPS 协商失败。", en: "SSL Handshake Failed. The TLS negotiation with the origin failed.", nonStandard: true },
  { code: 526, name: "Invalid SSL Certificate", zh: "证书无效。源站证书过期、域名不匹配或不受信任。", en: "Invalid SSL Certificate. The origin certificate is expired, mismatched or untrusted.", nonStandard: true },
  { code: 527, name: "Railgun Error", zh: "Railgun 错误。Cloudflare 的 Railgun 连接中断（已弃用）。", en: "Railgun Error. The Railgun connection broke (deprecated).", nonStandard: true },
  { code: 530, name: "Site is Frozen", zh: "站点被冻结。Pantheon 主机用于表示站点暂停服务。", en: "Site is Frozen. Pantheon uses this for a suspended site.", nonStandard: true },
  { code: 598, name: "Network Read Timeout", zh: "网络读超时。代理读取上游响应超时，非标准。", en: "Network Read Timeout. A proxy timed out reading upstream; not standard.", nonStandard: true },
  { code: 599, name: "Network Connect Timeout", zh: "网络连接超时。代理连接上游超时，非标准。", en: "Network Connect Timeout. A proxy timed out connecting upstream; not standard.", nonStandard: true },
];

export const STATUS_CLASSES: { id: string; label: string; range: string }[] = [
  { id: "1xx", label: "1xx 信息", range: "100–199" },
  { id: "2xx", label: "2xx 成功", range: "200–299" },
  { id: "3xx", label: "3xx 重定向", range: "300–399" },
  { id: "4xx", label: "4xx 客户端错误", range: "400–499" },
  { id: "5xx", label: "5xx 服务端错误", range: "500–599" },
];
