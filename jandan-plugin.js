
const axios = require('axios')
const cheerio = require('cheerio');
const { segment } = require('koishi');

let baseUrl = "http://jandan.net";
let top = "/top";
let top4h = "/top-4h";
var time = 60 * 60 * 1;
let cid;
const storage = {
    updateTime:"",
    dataList:[],
    usersPoint:{},
    views:[]
}
// todo update url concat
// use database stroe date
// format double number %.2f
// set docker 
async function getTop(session) {

    this.session = session;
    let index = 0;
    if (storage.usersPoint[cid] === undefined) {
        storage.usersPoint[cid] = 0;
    } else {
        index = storage.usersPoint[cid];
    }
    storage.usersPoint[cid] ++;

    if(index > storage.dataList.length ) {
        session.send(`没了看完了等${time/60}分钟后重置吧${segment("face",{id:"174"})}`);
    } 

    let result = storage.dataList[index];
    let results = [];
    let posText = segment("face",{id:"76"});
    let negText = segment("face",{id:"77"});
    let posVal = result.pos;
    let negVal = result.neg;
    results.push(`${posText}:${posVal}\t${negText}:${negVal}`);
    results.push(segment("text",{content:result.content}))
    for (let i = 0; i < result.imgs.length; i++) {
        const img = result.imgs[i];
        results.push(segment("image",{url:`http:${img}`}));
    }
    
    
    session.send(results.join("\n"))
}
analyzeAndSave(baseUrl + top4h,storage);
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

async function analyzeAndSave(url,storage) {
    console.log("get data...")
    let html = await request(url);
    const $ = cheerio.load(html.data);
    let commentList = $("ol.commentlist li");
    for (let i=0;i< commentList.length;i++) {
        let el = commentList[i];
        let url = $(".author a",el).attr("name");
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
            id:url,
            content:content,
            imgs:imgs,
            pos:pos,
            neg:neg,
        }
        if (!storage.views.includes(url)) {
            storage.dataList.push(commentObj);
            storage.views.push(url);
        }
    }
    storage.dataList =  storage.dataList.reverse();
    storage.updateTime = new Date();
}



module.exports = (ctx) => {
    ctx.middleware((session, next) => {
      if (session.content === 'd') {
        cid = session.cid;
        getTop(session);
      }
      return next()
    })
  }