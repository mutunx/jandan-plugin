// 配置项文档：https://koishi.js.org/api/app.html
module.exports = {
  // Koishi 服务器监听的端口
  port: 5701,
  onebot: {
    // 对应 cqhttp 配置项 http_config.post_urls, ws_reverse_servers.reverse_url
    path: '',
    secret: 'zhuT',
  },
  bots: [{
    type: 'onebot:http',
    // 对应 cqhttp 配置项 http_config.port
    server: 'http://localhost:5700',
    selfId: 1438898411,
    token: '',
  }],
  plugins: {
    'chat': {},
    'chess': {},
    'common': {},
    './jandan-plugin': {},
  },
}
