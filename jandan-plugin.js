
const axios = require('axios')
const cheerio = require('cheerio');
const fs = require("fs");
const YAML = require("yamljs")
const { segment } = require('koishi');
const config = loadYAMLFile("./config.yaml");
const baseUrl = config.jandan.baseUrl;
let time = config.jandan.refreshInterval;
let cmds = config.jandan.cmds;
const top4h = config.jandan.top4h;
const storage = {
    updateTime:"",
    dataList:{},
    usersPoint:{},
    views:[]
}

async function jandan(session) {
    let cid = session.cid;
    const type = session.content;
    let index = 0;
    if (storage.usersPoint[cid] === undefined) {
        storage.usersPoint[cid] = new Object();   
    } 
    if (storage.usersPoint[cid][type] === undefined) {
        storage.usersPoint[cid][type] = 0;
    }
    index = storage.usersPoint[cid][type];
    storage.usersPoint[cid][type] ++;

    if(index >= storage.dataList[type].length ) {
        session.send(`没了${cmds[type].name}看完了等${(time/60).toFixed(2)}分钟后重置吧,也可以看看别的${segment("face",{id:"174"})}`);
        storage.usersPoint[cid][type] = -1;
        return;
    } 

    let result = storage.dataList[type][index];
    let response = [];
    let dividerFront = `${cmds[type].name}${index+1}/${storage.dataList[type].length}-------->/t/${result.id}`;
    let dividerEnd = dividerFront;
    let posText = segment("face",{id:"201"});
    let negText = segment("face",{id:"204"});
    let posVal = result.pos;
    let negVal = result.neg;
    response.push(dividerFront);
    response.push(`${posText} ${posVal}\t${negText} ${negVal}`);
    response.push(segment("text",{content:result.content}));
    for (let i = 0; i < result.imgs.length; i++) {
        const img = result.imgs[i];
        response.push(segment("image",{
            url:`http:${img}`,
            timeout:`10000`,
            cache:true,
        }));
    }
    if (result.tucao !== undefined && result.tucao !== null && result.tucao !== "") {
        response.push(`>>>${segment("face",{id:"299"})}吐槽:`)
        response.push(`${result.tucao}`)
    }
    
    
    session.send(response.join("\n"));
}

function loadYAMLFile(file) {
    return YAML.parse(fs.readFileSync(file).toString());
}

function request(url) {
    return axios.get(url)
}

// update 4h part by interval time and init users view position
var t = setInterval(function () {
    let now = new Date();
    if (now.getHours() === 6 && now.getMinutes() === 30 && now.getSeconds() === 30) {
        console.log("new day new data",new Date());
        init();
        for (i in storage.usersPoint) {
            for (k in storage.usersPoint[i]) {
                storage.usersPoint[i][k] = 0;
            }
        }
    }
    if(time <= 0) {
        time = config.jandan.refreshInterval;
        console.log("auto update:",now);
        storage.dataList["d4"] = [];
        analyzeAndSave("d4");
        for (i in storage.usersPoint) {
            for (k in storage.usersPoint[i]) {
                if (storage.usersPoint[i][k] === -1 || k === "d4") {
                    storage.usersPoint[i][k] = 0;
                } 
            }
        }
    } else {
        time --;
    }
}, 1000)

async function analyzeAndSave(...types) {
    for (let i = 0; i < types.length; i++) {
        const type = types[i];
        const url = baseUrl + cmds[type].url;
        let html = await request(url);
        const $ = cheerio.load(html.data);
        let commentList = $("ol.commentlist li");
        console.log(`get type ${i} ${commentList.length} comments`)
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
            let content = $(".text  p",el).text();
            let tucao = $(".tucao-content p",el).text();
            content = content.replace(tucao,"");
            let pos = $(".jandan-vote span",el)[0].children[0].data;
            let neg = $(".jandan-vote span",el)[1].children[0].data;
            let commentObj = {
                id:name,
                content:content,
                imgs:imgs,
                pos:pos,
                neg:neg,
                tucao:tucao,
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

// get all part of jandan hot
async function init() {
    console.log("init...",new Date());
    const keys = Object.keys(cmds);
    for (i of keys) {
        storage.dataList[i] = [];
    }
    storage.views = [];
    await analyzeAndSave(...keys);
    for (i of keys) {
        console.log(`${i}更新完成,获取数据个数${storage.dataList[i].length}`);
    }
}
init();

module.exports = (ctx) => {
    
    
    ctx.middleware((session, next) => {
      if (Object.keys(cmds).includes(session.content)) {
          session.send(segment("face",{id:"202"}));
          jandan(session);
      }
      return next() 
    });


  }