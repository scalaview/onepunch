var config = {
                'token': '',
                'appId': '',
                'aesKey': '',
                'appSecret': '',
                'menus': {
                           "button":[
                           {
                                "type":"click",
                                "name":"玩流量",
                                "sub_button":[
                                {
                                  "type":"view",
                                  "name":"新手攻略",
                                  "url":"http://yiliuliang.net"
                                },
                                {
                                  "type":"view",
                                  "name":"领取记录",
                                  "url":"http://yiliuliang.net"
                                },
                                {
                                  "type":"view",
                                  "name":"领取流量",
                                  "url":"http://yiliuliang.net"
                                },
                                {
                                  "type":"click",
                                  "name":"今日任务",
                                  "key":"V1001_TODAY_TASKS"
                                }]
                            },
                            {
                                "type":"view",
                                "name":"我的钱包",
                                "url":"http://yiliuliang.net"
                            },
                            {
                              "type":"view",
                              "name":"更多",
                              "sub_button":[
                              {
                                "type":"view",
                                "name":"关于易流量",
                                "url":"http://yiliuliang.net"
                              }]
                            }]
                        },
                'menus_keys': {
                  'button1' :'V1001_TODAY_TASKS'
                }
              };

module.exports = config;