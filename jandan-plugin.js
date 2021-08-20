
const axios = require('axios')
const cheerio = require('cheerio');
const fs = require("fs");
const YAML = require("yamljs")
const { segment } = require('koishi');
const config = loadYAMLFile("./config.yaml");
const baseUrl = config.jandan.baseUrl;
let time = config.jandan.refreshInterval;
let cmds = config.jandan.cmds;
const storage = {
    updateTime:"",
    dataList:{},
    usersPoint:{},
    views:[]
}
// todo update url concat
// 
// add log
// use database stroe date
// format double number %.2f
// set docker 
// pic size too large emit
// pic cache 
// add manual reset index
// fix timeout NaN
async function jandan(session) {
    let cid = session.cid;
    const type = session.content;
    this.session = session;
    let index = 0;
    if (storage.usersPoint[cid] === undefined) {
        storage.usersPoint[cid] = new Object();   
    } 
    if (storage.usersPoint[cid][type] === undefined) {
        storage.usersPoint[cid][type] = 0;
    }
    index = storage.usersPoint[cid][type];
    storage.usersPoint[cid][type] ++;

    if(index > storage.dataList[type].length ) {
        session.send(`没了看完了等${time/60}分钟后重置吧${segment("face",{id:"174"})}`);
    } 

    let result = storage.dataList[type][index];
    let response = [];
    let posText = segment("face",{id:"76"});
    let negText = segment("face",{id:"77"});
    let posVal = result.pos;
    let negVal = result.neg;
    response.push(`${posText}:${posVal}\t${negText}:${negVal}`);
    response.push(segment("text",{content:result.content}));
    for (let i = 0; i < result.imgs.length; i++) {
        const img = result.imgs[i];
        response.push(segment("image",{
            url:`http:${img}`,
            timeout:`5000`,
            cache:true,
        }));
    }
    response.push(`/t/${result.id}`);
    
    
    session.send(response.join("\n"));
}

function loadYAMLFile(file) {
    return YAML.parse(fs.readFileSync(file).toString());
}

function request(url) {
    return axios.get(url)
}
var t = setInterval(function () {
    if(time <= 0) {
        clearinterval(t);
        console.log("auto update:",new Date())
        analyzeAndSave(baseUrl + top4h,storage);
        for (i in storage.usersPoint) {
            storage.usersPoint[i] = 0;
        }
    } else {
        time --;
    }
}, 1000)

async function analyzeAndSave(...types) {
    for (let i = 0; i < types.length; i++) {
        const type = types[i];
        const url = baseUrl + cmds[type];
        let html = await request(url);
        const $ = cheerio.load(html.data);
        let commentList = $("ol.commentlist li");
        for (let i=0;i< commentList.length;i++) {
            let el = commentList[i];
            let name = $(".author a",el).attr("name");
            let imgs = [];
            let imgUrls = $("p a",el);
            for (let i = 0; i < imgUrls.length; i++) {
                const img = imgUrls[i];
                imgs.push(img.attribs.href)
            }
            imgs = imgs.reverse();
            let content = $("p",el).text();
            let pos = $(".jandan-vote span",el)[0].children[0].data;
            let neg = $(".jandan-vote span",el)[1].children[0].data;
            let commentObj = {
                id:name,
                content:content,
                imgs:imgs,
                pos:pos,
                neg:neg,
            }
            if (!storage.views.includes(name)) {
                storage.dataList[type].push(commentObj);
                storage.views.push(name);
            }
        }
        storage.dataList[type] =  storage.dataList[type].reverse();
        storage.updateTime = new Date();
    }
}


async function init() {
    console.log("init...");
    const keys = Object.keys(cmds);
    for (i of keys) {
        storage.dataList[i] = [];
    }
    await analyzeAndSave(...keys);
}
init();

module.exports = (ctx) => {
    

    ctx.middleware((session, next) => {
      if (Object.keys(cmds).includes(session.content)) {
          session.send(`少男祈祷中...${segment("face",{id:"190"})}`);
          jandan(session);
      }
      return next() 
    })
  }